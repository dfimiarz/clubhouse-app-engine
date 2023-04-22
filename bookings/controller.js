const sqlconnector = require('../db/SqlConnector')
const { checkPermission } = require('./permissions/BookingPermissions')
const { getProcessor } = require('./command')
const MatchCommandProcessors = require('./processor')
const SQLErrorFactory = require('./../utils/SqlErrorFactory');
const RESTError = require('./../utils/RESTError');
const { getNewBooking, insertBooking,checkOverlap } = require('./BookingUtils');
const { cloudLog, cloudLogLevels : loglevels } = require('./../utils/logger/logger');

const CLUB_ID = process.env.CLUB_ID;

async function getBookingsForDate(date) {
    if (date === null)
        return [];

    const connection = await sqlconnector.getConnection()
    const player_query = "select p.activity,p.person as person_id,p.type as player_type,p.status,person.firstname, person.lastname,person.type as person_type from participant p join person on person.id = p.person where p.activity in ( ? ) order by activity FOR SHARE"
    
    const activity_query = `SELECT 
                                activity.id,
                                court,
                                bumpable,
                                DATE_FORMAT(date, '%Y-%m-%d') AS date,
                                end,
                                start,
                                TIME_TO_SEC(start) DIV 60 AS start_min,
                                TIME_TO_SEC(end) DIV 60 AS end_min,
                                type,
                                created,
                                updated,
                                notes,
                                at.desc AS booking_type_desc,
                                at.group AS group_id,
                                ag.utility_factor AS utility 
                            FROM
                                activity
                                    JOIN
                                activity_type at ON at.id = activity.type
                                    JOIN
                                activity_group ag ON at.group = ag.id
                                    JOIN
                                court c ON c.id = activity.court
                                    JOIN
                                club cl ON c.club = cl.id
                            WHERE
                                date = ?
                                AND active = 1
                                AND cl.id = ? 
                            FOR SHARE`;

    let bookings = new Map();

    try {

        await sqlconnector.runQuery(connection, "START TRANSACTION READ ONLY", []);

        let bookings_array = await sqlconnector.runQuery(connection, activity_query, [date,CLUB_ID]);

        try{

            if (bookings_array.length === 0) {
                return [];
            }

            bookings_array.forEach(element => {
                bookings.set(element.id, { id: element.id, court: element.court, bumpable: element.bumpable, date: element.date, end: element.end, start: element.start, start_min: element.start_min, end_min: element.end_min , type: element.type, notes: element.notes, updated: element.updated, created: element.created, players: [], booking_type_desc: element.booking_type_desc, group_id: element.group_id, utility: element.utility });
            });

            const booking_ids = Array.from(bookings.keys());

            const players_array = await sqlconnector.runQuery(connection, player_query, [booking_ids])

            await sqlconnector.runQuery(connection, "COMMIT", [])

            players_array.forEach(player => {
                const activity_id = player.activity;

                if (bookings.has(activity_id)) {
                    const activity = bookings.get(activity_id);
                    bookings.delete(activity_id);
                    activity.players.push({ person_id: player.person_id, type: player.player_type, status: player.status, firstname: player.firstname, lastname: player.lastname, person_type: player.person_type })
                    bookings.set(activity_id, activity);
                }

            })

            return Array.from(bookings.values());
            
        }
        finally{
            await sqlconnector.runQuery(connection, "COMMIT", [])
        }
    }
    catch (error) {
        cloudLog(loglevels.error,`Unable to read bookings: ${ error.message }`)
        throw new Error(error.sqlMessage)
    }
    finally {
        connection.release()
    }
}

/**
 * 
 * @param { Request } request 
 */
async function addBooking(request) {

    const OPCODE = "ADD_BOOKING";

    const players = request.body.players;

    //Initialize a hashmap to store player ids and roles
    const playerTypeMap = new Map();

    players.forEach((player) => {
        playerTypeMap.set(player.id,player.type);
    });


    //START Check unique players
    const uniqueIds = Array.from(playerTypeMap.keys());

    if (uniqueIds.length !== players.length) {
        throw new RESTError(422, "Duplicate players found");
    }
    //END

    const person_check_q = `SELECT p.id,p.type,m.role FROM clubhouse.person p left join member m on m.person_id = p.id WHERE p.id IN ? AND p.club = ? LOCK IN SHARE MODE`;

    const connection = await sqlconnector.getConnection();

    try {

        await sqlconnector.runQuery(connection, "START TRANSACTION READ WRITE", []);

        try {


            //START Check players
            const persons_result = await sqlconnector.runQuery(connection, person_check_q, [[uniqueIds], CLUB_ID]);

            if (!(Array.isArray(persons_result) && persons_result.length === uniqueIds.length)) {
                throw new RESTError(422, "Person(s) not found");
            }


            const initValues = {
                court: request.body.court,
                start: request.body.start,
                date: request.body.date,
                end: request.body.end,
                notes: request.body.note,
                bumpable: request.body.bumpable,
                type: request.body.type
            }

            initValues.players = persons_result.map((person) => ({ person_id: person.id, person_type: person.type, member_role: person.role, player_type: playerTypeMap.get(person.id) }))

            const booking = await getNewBooking(connection,initValues);

            if( ! booking ){
                cloudLog(loglevels.error,"Unable to create a new booking. Values " + JSON.stringify(initValues));
                throw new RESTError(500,"Unable to create a new booking");
            }

            //Check permissions
            const errors = checkPermission('create', booking);
            
            if (errors.length > 0) {
                cloudLog(loglevels.error,"Booking permission denied. Booking: " + JSON.stringify(booking)+ " Error: " + errors[0]);
                throw new RESTError(422, "Create permission denied: " + errors[0]);
            }

            //START Check for overlapping bookings
            const overlapping_bookings = await checkOverlap(connection,booking.end,booking.start,booking.court_id,booking.date);

            if( overlapping_bookings.length !== 0 ){
                const overlap_record = {
                    booking_date: booking.date,
                    booking_start: booking.start,
                    booking_end: booking.end,
                    booking_court_id: booking.court_id,
                    overlapping_ids: Array.from(overlapping_bookings)
                }

                cloudLog(loglevels.warning,`Booking overlap found: ${JSON.stringify(overlap_record)}` );
                throw new RESTError(422,"Booking overlap found.");
            }
            //END

            await insertBooking(connection, booking );

            await sqlconnector.runQuery(connection, "COMMIT", []);

            cloudLog(loglevels.info,`Booking added: ${JSON.stringify(booking)}`);
        }
        catch (error) {
            await sqlconnector.runQuery(connection, "ROLLBACK", []);
            throw error;
        }

        
    }
    catch (error) {
        throw error instanceof RESTError ? error : new SQLErrorFactory.getError(OPCODE, error);
    }
    finally {
        connection.release()
    }
}


/**
 * 
 * @param { int } Session id 
 */
async function getBookingDetails(id) {

    const OPCODE = "GET_BOOKING";

    const booking_q =  `SELECT c.id AS court_id,
                        UNIX_TIMESTAMP(CONVERT_TZ(CONCAT(a.date, ' ', a.start),cl.time_zone,@@GLOBAL.time_zone)) AS utc_start,
                        UNIX_TIMESTAMP(CONVERT_TZ(CONCAT(a.date, ' ', a.end),cl.time_zone,@@GLOBAL.time_zone)) AS utc_end,
                        UNIX_TIMESTAMP(a.created) AS utc_created,
                        UNIX_TIMESTAMP(a.updated) AS utc_updated,
                        UNIX_TIMESTAMP(CONVERT_TZ(a.date,cl.time_zone,@@GLOBAL.time_zone)) AS utc_day_start,
                        UNIX_TIMESTAMP(NOW()) AS utc_req_time,
                        CAST(CONVERT_TZ(NOW(), @@GLOBAL.time_zone, cl.time_zone) AS DATE) + 0 AS loc_req_date,
                        CAST(CONVERT_TZ(NOW(), @@GLOBAL.time_zone, cl.time_zone) AS TIME) AS loc_req_time,
                        DATE_FORMAT(a.date,"%Y-%m-%d" ) as date,
                        a.date + 0 as numeric_date,
                        a.start as start,
                        a.end as end,
                        a.active,
                        a.type,
                        at.desc AS booking_type_desc,
                        at.lbl AS booking_type_lbl,
                        a.bumpable,
                        a.created,
                        a.updated,
                        a.notes,
                        a.id,
                        MD5(a.updated) AS etag,
                        c.name as court_name,
                        cl.time_zone,
                        cl.id as club_id
                    FROM
                        activity a
                            JOIN
                        court c ON a.court = c.id
                            JOIN
                        club cl ON cl.id = c.club
                            JOIN
                        activity_type at ON at.id = a.type
                    WHERE
                        a.id = ? and cl.id = ?
                    LOCK IN SHARE MODE`;

    const player_q = `SELECT 
                    activity, 
                    person as person_id, 
                    p.firstname, 
                    p.lastname,
                    p.type as person_type_id, 
                    pert.lbl as person_type_lbl, 
                    participant.type as player_type, 
                    pt.lbl as player_type_lbl,
                    pt.desc as player_type_desc
                FROM
                    participant
                        JOIN
                    person p ON p.id = participant.person
                        JOIN
                    participant_type pt ON pt.id = participant.type
                        JOIN
                    person_type pert ON pert.id = p.type
                WHERE 
                    activity = ?
                LOCK IN SHARE MODE    
                `;

    const connection = await sqlconnector.getConnection();

    try {

        await sqlconnector.runQuery(connection, "START TRANSACTION", []);

        const booking_result = await sqlconnector.runQuery(connection,booking_q,[id,CLUB_ID])
        const players_result = await sqlconnector.runQuery(connection,player_q,[id])

        await sqlconnector.runQuery(connection,"COMMIT",[]);

        if( ! (Array.isArray(booking_result) && booking_result.length === 1) ){
            cloudLog(loglevels.error,`Booking ${id} not found` );
            throw new RESTError(404, "Booking not found");
        }

        if( ! Array.isArray(players_result) || players_result.length === 0 ){
            cloudLog(loglevels.error,`Players for booking ${id} not found` );
            throw new RESTError(500, "Players not found");
        }

        const booking = {
            id: booking_result[0]['id'],
            utc_start: booking_result[0]['utc_start'],
            utc_end: booking_result[0]['utc_end'],
            utc_day_start: booking_result[0]['utc_day_start'],
            utc_req_time: booking_result[0]['utc_req_time'],
            loc_req_date: booking_result[0]['loc_req_date'],
            loc_req_time: booking_result[0]['loc_req_time'],
            utc_created: booking_result[0]['utc_created'],
            utc_updated: booking_result[0]['utc_updated'],
            date: booking_result[0]['date'],
            numeric_date: booking_result[0]['numeric_date'],
            start: booking_result[0]['start'],
            end: booking_result[0]['end'],
            active: booking_result[0]['active'],
            type: booking_result[0]['type'],
            booking_type_desc: booking_result[0]['booking_type_desc'],
            booking_type_lbl: booking_result[0]['booking_type_lbl'],
            bumpable: booking_result[0]['bumpable'],
            created: booking_result[0]['created'],
            updated: booking_result[0]['updated'],
            notes: booking_result[0]['notes'],
            etag: booking_result[0]['etag'],
            court_id: booking_result[0]['court_id'],
            court_name: booking_result[0]['court_name'],
            time_zone: booking_result[0]['time_zone'],
            club_id: booking_result[0]['club_id'],
            players: [],
            permissions: []
        }
    
        players_result.forEach(pinfo => {
            const player = {
                person_id: pinfo['person_id'],
                firstname: pinfo['firstname'],
                lastname: pinfo['lastname'],
                person_type_id: pinfo['person_type_id'],
                person_type_lbl: pinfo['person_type_lbl'],
                player_type: pinfo['player_type'],
                player_type_lbl: pinfo['player_type_lbl'],
                player_type_desc: pinfo['player_type_desc'],
            }
            booking.players.push(player)
        });
        
        return booking;
    }
    catch (error) {
        throw error instanceof RESTError ? error : new SQLErrorFactory.getError(OPCODE, error)

    }
    finally {
        connection.release()
    }

}





/**
 * 
 * @param { Number } id Id of the object being processed
 * @param { Object } cmd 
 */
function processPatchCommand(id, cmd) {

    const processor_name = getProcessor(cmd.name)

    if (typeof MatchCommandProcessors[processor_name] === "function")
        return MatchCommandProcessors[processor_name](id, cmd.params)
    else
        return Promise.reject(new Error("Unable to run command"))

}

/**
 * 
 * @param { Number } court 
 * @param { String } date 
 * @param { String } start 
 * @param { String } end 
 */

async function getOverlappingBookings( court, date, start, end ){

    const overlap_q = `SELECT a.id,DATE_FORMAT(date,"%Y-%m-%d" ) as date,start,end,a.court,c.name as court_name FROM activity a JOIN court c ON a.court = c.id WHERE ? > start AND ? < end AND court = ? AND date = ? AND active = 1`;

    const connection = await sqlconnector.getConnection();

    try {
        const overlapping_result = await sqlconnector.runQuery(connection,overlap_q,[end,start,court,date])

        return overlapping_result.map((booking) => {
            return { 
                id: booking["id"], 
                date: booking["date"], 
                start: booking["start"],
                end: booking["end"],
                court: booking["court"],
                court_name: booking["court_name"]
            }
        })
    }
    catch(err){
        throw new RESTError(500,"Error querying database");
    }
    finally{
        connection.release();
    }

}

module.exports = {
    addBooking,
    getBookingDetails,
    processPatchCommand,
    getBookingsForDate,
    getOverlappingBookings
}