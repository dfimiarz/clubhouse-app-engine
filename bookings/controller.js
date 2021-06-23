const sqlconnector = require('../db/SqlConnector')
const { hasCreatePermission } = require('./permissions/MatchPermissions')
const { validateBooking } = require('./permissions/BookingPermissions')
const { getProcessor } = require('./command')
const MatchCommandProcessors = require('./processor')
const SQLErrorFactory = require('./../utils/SqlErrorFactory');
const RESTError = require('./../utils/RESTError');

const CLUB_ID = process.env.CLUB_ID;

// async function getMatchesForDate(date){

//     if( date === null )
//         return []

//     const connection = await sqlconnector.getConnection()
//     const query = `call getBookingsForDate(?)`
//     try{

//         let bookings_array = await sqlconnector.runQuery(connection,query,[date])

//         return bookings_array[0].map( bookingobj => JSON.parse(bookingobj.booking) )
//     }
//     catch(error){
//         throw new Error(error.sqlMessage)
//     }
//     finally{
//         connection.release()
//     }


// }

async function getBookingsForDate(date){
    if( date === null )
        return []

    const connection = await sqlconnector.getConnection()
    const player_query = `select p.activity,p.person as person_id,p.type as player_type,p.status,person.firstname, person.lastname,person.type as person_type from player p join person on person.id = p.person where p.activity in ( ? ) order by activity`
    const activity_query = 'select id,court,bumpable,DATE_FORMAT(date,"%Y-%m-%d") as date,end,start,type,created,updated,notes FROM activity where date = ? and active = 1';

    let bookings = new Map();

    try{

        await sqlconnector.runQuery(connection,"START TRANSACTION READ ONLY",[])

        let bookings_array = await sqlconnector.runQuery(connection,activity_query,[date])

        if( bookings_array.length === 0 ){
            return []
        }

        bookings_array.forEach(element => {
            bookings.set(element.id,{ id: element.id, court: element.court, bumpable: element.bumpable, date: element.date, end: element.end, start: element.start, type: element.type, notes: element.notes, updated: element.updated, created: element.created, players: []});
        });

        const booking_ids = Array.from(bookings.keys());

        const players_array = await sqlconnector.runQuery(connection,player_query,[booking_ids])

        await sqlconnector.runQuery(connection,"COMMIT",[])

        players_array.forEach(player => {
            const activity_id = player.activity;

            if( bookings.has(activity_id) ){
                const activity = bookings.get(activity_id);
                bookings.delete(activity_id)
                activity.players.push({person_id: player.person_id,type: player.player_type, status: player.status, firstname: player.firstname, lastname: player.lastname, person_type: player.person_type})
                bookings.set(activity_id,activity)
            }

        })

        return Array.from(bookings.values());
    }
    catch(error){

        console.log(error)
        throw new Error(error.sqlMessage)
    }
    finally{
        connection.release()
    }
}


/**
 * 
 * @param { Request } request 
 */
async function addMatch( request ){

    const OPCODE = "ADD_BOOKING";

    const players = request.body.players
    const court = request.body.court
    const date = request.body.date
    const start = request.body.start
    const end = request.body.end
    const note = request.body.note
    const bumpable = request.body.bumpable
    const bookingtype = request.body.type

    const session_time_q = `SELECT
                        c.id as court,
                        UNIX_TIMESTAMP(convert_tz(concat(?,' ',?),cl.time_zone,@@GLOBAL.time_zone )) as utc_start, 
                        UNIX_TIMESTAMP(convert_tz(concat(?,' ',?),cl.time_zone,@@GLOBAL.time_zone )) as utc_end
                        FROM court c 
                        JOIN club cl ON cl.id = c.club
                        WHERE c.id = ?`

    const connection = await sqlconnector.getConnection()
    
    try{
        let activity_result = await sqlconnector.runQuery(connection,session_time_q,[date,start,date,end,court])

        if( activity_result.length !== 1 ) {
            throw new RESTError(422, "Failed to verify booking time")
        }

        if (! hasCreatePermission( activity_result[0] )){
            throw new RESTError(422, "Create permission denied. Check time")
        }

        await sqlconnector.runQuery(connection,`call addMatch(?,?,?,?,?,?,?,?)`,[bookingtype,court,date,start,end,bumpable,note,JSON.stringify(players)])
    }
    catch(error){
        throw error instanceof RESTError ? error : new SQLErrorFactory.getError(OPCODE, error)
    }
    finally{
        connection.release()
    }
}

/**
 * 
 * @param { Request } request 
 */
 async function addBooking( request ){

    const OPCODE = "ADD_BOOKING";

    console.log(request.body)

    const players = request.body.players;

    const booking = (({court,date,start,end,note,bumpable,type}) => ({ court: court, date: date, start: start, end: end, note: note, bumpable: bumpable,type:type}) )(request.body)

    //START Check unique players
    const uniqueIds = [...new Set(players.map((player) => player.id))];

    if( uniqueIds.length !== players.length ){
        throw new RESTError(422,"Duplicate players found");
    }
    //END

    //DATE_FORMAT(convert_tz(now(),@@GLOBAL.time_zone,cl.time_zone),"%Y-%m-%d") as loc_req_date,

    const session_time_q = `SELECT
                        c.id as court,
                        UNIX_TIMESTAMP(convert_tz(concat(?,' ',?),cl.time_zone,@@GLOBAL.time_zone )) as utc_start, 
                        UNIX_TIMESTAMP(convert_tz(concat(?,' ',?),cl.time_zone,@@GLOBAL.time_zone )) as utc_end,
                        UNIX_TIMESTAMP(convert_tz(?,cl.time_zone,@@GLOBAL.time_zone )) as utc_day_start,
                        UNIX_TIMESTAMP(now()) as utc_req_time,
                        CAST(convert_tz(now(),@@GLOBAL.time_zone,cl.time_zone) as DATE) + 0 as loc_req_date,
                        CAST(? as DATE) + 0 as booking_date,
                        c.openmin,
                        c.closemin,
                        c.state
                        FROM court c 
                        JOIN club cl ON cl.id = c.club
                        WHERE c.id = ?`

    //end,start,court,date
    const overlap_check_q = `SELECT EXISTS(
                        SELECT 
                        id
                        FROM
                        activity
                        WHERE
                        ? > start
                        AND ? < end
                        AND court = ?
                        AND date = ?
                        AND active = 1 FOR UPDATE) as session_found`;

    const person_check_q = `SELECT p.id,p.type,m.role FROM clubhouse.person p left join member m on m.person_id = p.id WHERE p.id IN ? AND p.club = ? LOCK IN SHARE MODE`;


    const connection = await sqlconnector.getConnection();
    
    try{

        await sqlconnector.runQuery(connection,"START TRANSACTION",[])

        try {

            //START Check players
            const persons_result = await sqlconnector.runQuery(connection,person_check_q,[[uniqueIds],CLUB_ID]);

            if( ! ( Array.isArray(persons_result) && persons_result.length === uniqueIds.length )){
                throw new RESTError(422,"Person(s) not found");
            }

            const playerData = persons_result.map((person) => ({id:person.id,type:person.type,role:person.role}))
            //END


            //START Get court and time data
            let activity_result = await sqlconnector.runQuery(connection,session_time_q,[booking.date,booking.start,booking.date,booking.end,booking.date,booking.date,booking.court])

            if( activity_result.length !== 1 ) {
                throw new RESTError(422, "Failed to verify booking time");
            }

            const bookingParams = 
                {   
                    court: activity_result[0].court, 
                    utc_start: activity_result[0].utc_start, 
                    utc_end: activity_result[0].utc_end, 
                    utc_day_start: activity_result[0].utc_day_start,
                    utc_req_time: activity_result[0].utc_req_time,
                    local_req_date: activity_result[0].loc_req_date,
                    booking_date: activity_result[0].booking_date,
                    court_open: activity_result[0].openmin, 
                    court_closed: activity_result[0].closemin, 
                    courtstate: activity_result[0].state,
                    players: playerData,
                    type: booking.type,
                    bumpable: booking.bumpable
                }
            //END

            console.log(bookingParams);

            //Check permissions
            const errors = validateBooking('create',bookingParams);
            if ( errors.length > 0 ){
                throw new RESTError(422, "Create permission denied: " + errors[0]);
            }

            //START Check for overlapping bookings
            const overlap_result = await sqlconnector.runQuery(connection,overlap_check_q,[booking.end,booking.start,booking.court,booking.date]);

            if( ! ( Array.isArray(overlap_result) && overlap_result.length === 1 )){
                throw new RESTError(422,"Error checking for overlapping bookings");
            }

            if( overlap_result[0].session_found === 1 ){
                throw new RESTError(422,"Overlappling booking found");
            }
            //END

            __addBooking(connection,booking,players);

            await sqlconnector.runQuery(connection,"COMMIT",[])
        }
        catch(error){
            await sqlconnector.runQuery(connection, "ROLLBACK", [])
            throw error;
        }
    }
    catch(error){
        console.log(error)
        throw error instanceof RESTError ? error : new SQLErrorFactory.getError(OPCODE, error)
    }
    finally{
        connection.release()
    }
}

/**
 * 
 * @param {*} connection Mysql connection object
 * @param {*} bookinginfo Booking info object
 * 
 * This function does the actual insert to the datbase. Must be called within a transaction.
 */
async function __addBooking(connection,bookinginfo, players){

    //console.log(bookinginfo,players)

    const insertActivityQ = `INSERT INTO \`activity\` (\`id\`, \`created\`, \`updated\`, \`type\`, \`court\`, \`date\` ,\`start\`, \`end\`, \`bumpable\`,\`active\`,\`notes\`)
    VALUES (NULL, NULL, NULL, ?, ?, ?, ?, ?, ? ,1, ?)`;

    const insertPlayersQ = `INSERT INTO \`player\` VALUES ?`;

    const activity_result = await sqlconnector.runQuery(connection,insertActivityQ,[bookinginfo.type, bookinginfo.court, bookinginfo.date, bookinginfo.start, bookinginfo.end, bookinginfo.bumpable, bookinginfo.note])

    const activity_id = activity_result.insertId;

    //`id`, `activity`, `person`, `status`, `type`
    const playersArrays = players.map((player) => [null,activity_id,player.id,1,player.type])

    const player_result = await sqlconnector.runQuery(connection,insertPlayersQ,[playersArrays])


}

/**
 * 
 * @param { int } Session id 
 */
async function getBookingDetails(id){

    const OPCODE = "GET_BOOKING";

    let query = `SELECT
                    JSON_OBJECT(
                            'id', a.id, 
                            'updated' , MD5(a.updated), 
                            'type_lbl', at.desc ,
                            'date' , a.date ,
                            'start', a.start, 
                            'end' , a.end , 
                            'court' , a.court, 
                            'bumpable', bumpable , 
                            'notes', a.notes , 
                            'type', a.type,
                            'active', a.active,
                            'players', p.players, 
                            'utc_start', UNIX_TIMESTAMP(convert_tz(concat(a.date,' ',a.start),cl.time_zone,@@GLOBAL.time_zone )),
                            'utc_end', UNIX_TIMESTAMP(convert_tz(concat(a.date,' ',a.end),cl.time_zone,@@GLOBAL.time_zone ))
                        ) as 'match'
                FROM 
                    activity a
                LEFT JOIN (
                    SELECT activity,cast(concat('[',group_concat(json_object('id',person,'firstname',p.firstname,'lastname',p.lastname,'type',pt.desc)),']') as JSON) as players 
                    FROM player
                    JOIN person p on p.id = player.person
                    JOIN player_type pt on pt.id = player.type
                    GROUP BY activity 
                    ) p
                ON a.id = p.activity
                JOIN court c ON a.court = c.id
                JOIN club cl ON cl.id = c.club
                JOIN activity_type at on at.id = a.type
                WHERE a.id = ?`;

    const connection = await sqlconnector.getConnection()

    try{
        const result = await sqlconnector.runQuery(connection,query,[id])

        if( ! (Array.isArray(result) && result.length === 1) ){
            throw new RESTError(404, "Booking not found")
        }

        const activity = result;

        return activity;
    }
    catch( error ){

        throw error instanceof RESTError ? error : new SQLErrorFactory.getError(OPCODE, error)
    
    }
    finally{
        connection.release()
    }

}





/**
 * 
 * @param { Number } id Id of the object being processed
 * @param { Object } cmd 
 */
function processPatchCommand(id, cmd){

    const processor_name = getProcessor(cmd.name)

    if( typeof MatchCommandProcessors[processor_name] === "function" )
        return MatchCommandProcessors[processor_name](id,cmd.params)
    else    
        return Promise.reject(new Error("Unable to run command"))
    
}

module.exports = {
    addMatch,
    addBooking,
    getBookingDetails,
    processPatchCommand,
    getBookingsForDate
}