const sqlconnector = require('../db/SqlConnector');

const CLUB_ID = process.env.CLUB_ID;

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
                        c.openmin AS court_open,
                        c.closemin AS court_close,
                        c.state AS court_state,
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
                        a.id = ? and cl.id = ? and  MD5(a.updated) = ?
                    FOR UPDATE`;

const player_q = `SELECT 
                        activity, 
                        person as person_id, 
                        p.firstname, 
                        p.lastname,
                        p.type as person_type_id, 
                        pert.lbl as person_type_lbl, 
                        player.type as player_type, 
                        pt.lbl as player_type_lbl,
                        pt.desc as player_type_desc
                FROM
                    player
                        JOIN
                    person p ON p.id = player.person
                        JOIN
                    player_type pt ON pt.id = player.type
                        JOIN
                    person_type pert ON pert.id = p.type
                WHERE 
                    activity = ?
                FOR UPDATE`;

const booking_time_q = `SELECT
                c.id as court_id,
                UNIX_TIMESTAMP(convert_tz(concat(?,' ',?),cl.time_zone,@@GLOBAL.time_zone )) as utc_start, 
                UNIX_TIMESTAMP(convert_tz(concat(?,' ',?),cl.time_zone,@@GLOBAL.time_zone )) as utc_end,
                UNIX_TIMESTAMP(convert_tz(?,cl.time_zone,@@GLOBAL.time_zone )) as utc_day_start,
                UNIX_TIMESTAMP(now()) as utc_req_time,
                CAST(convert_tz(now(),@@GLOBAL.time_zone,cl.time_zone) as DATE) + 0 as loc_req_date,
                CAST(CONVERT_TZ(NOW(), @@GLOBAL.time_zone, cl.time_zone) AS TIME) AS loc_req_time,
                CAST(? as DATE) + 0 as numeric_date,
                c.openmin as court_openmin,
                c.closemin as court_closemin,
                c.state as court_state,
                cl.time_zone,
                cl.id as club_id
                FROM court c 
                JOIN club cl ON cl.id = c.club
                WHERE c.id = ? and cl.id = ? FOR UPDATE`;

//end,start,court,date
const overlap_check_q = `
    SELECT 
    id
    FROM
    activity
    WHERE
    ? > start
    AND ? < end
    AND court = ?
    AND date = ?
    AND active = 1 FOR UPDATE`;


/**
 * 
 * @param {*} connection 
 * @param {*} id 
 * @param {*} etag 
 * 
 * This function must run within a transaction
 */
 async function getBooking(connection,id,etag ){

    const booking_result = await sqlconnector.runQuery(connection,booking_q,[id,CLUB_ID,etag]);
    const players_result = await sqlconnector.runQuery(connection,player_q,[id]);
    
    if (!(Array.isArray(booking_result) && booking_result.length === 1)) {
        return null;
    }

    if (!Array.isArray(players_result) || players_result.length === 0) {
        return null;
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
        court_open: booking_result[0]['court_open'],
        court_close: booking_result[0]['court_close'],
        court_state: booking_result[0]['court_state'],
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

/**
 * 
 * @param {*} connection Mysql connection object
 * @param {*} bookinginfo Booking info object
 * 
 * This function does the actual insert to the datbase. Must be called within a transaction.
 */
 async function insertBooking(connection, booking) {

    const insertActivityQ = `INSERT INTO \`activity\` (\`id\`, \`created\`, \`updated\`, \`type\`, \`court\`, \`date\` ,\`start\`, \`end\`, \`bumpable\`,\`active\`,\`notes\`)
    VALUES (NULL, NULL, NULL, ?, ?, ?, ?, ?, ? ,1, ?)`;

    const insertPlayersQ = `INSERT INTO \`player\` VALUES ?`;

    const activity_result = await sqlconnector.runQuery(connection, insertActivityQ, [booking.type, booking.court_id, booking.date, booking.start, booking.end, booking.bumpable, booking.notes])

    const activity_id = activity_result.insertId;

    //`id`, `activity`, `person`, `status`, `type`
    const playersArrays = booking.players.map((player) => [null, activity_id, player.person_id, 1, player.player_type])

    await sqlconnector.runQuery(connection, insertPlayersQ, [playersArrays])

    return activity_id;
}

/**
 * 
 * @param {*} connection 
 * @param {*} initValues 
 * 
 * Get a fresh booking. Must be run within a transaction
 */
async function getNewBooking(connection,initValues){

    if( ! initValues ){
        return null
    }

    const booking = {
        court_id: initValues.court,
        start: initValues.start,
        date: initValues.date,
        end: initValues.end,
        notes: initValues.notes,
        bumpable: initValues.bumpable,
        type: initValues.type,
        players: Array.from(initValues.players),
        active: 1,
        utc_created: null,
        utc_updated: null,
        etag: null
    }

     let bookingtime_result = await sqlconnector.runQuery(connection, booking_time_q, [booking.date, booking.start, booking.date, booking.end, booking.date, booking.date, booking.court_id, CLUB_ID])

     if (bookingtime_result.length !== 1) {
        return null
     }

     booking.numeric_date = bookingtime_result[0].numeric_date;
     booking.utc_start = bookingtime_result[0].utc_start;
     booking.utc_end = bookingtime_result[0].utc_end;
     booking.utc_day_start = bookingtime_result[0].utc_day_start;
     booking.utc_req_time = bookingtime_result[0].utc_req_time;
     booking.loc_req_date = bookingtime_result[0].loc_req_date;
     booking.loc_req_time = bookingtime_result[0].loc_req_time;
     booking.court_open = bookingtime_result[0].court_openmin;
     booking.court_closed = bookingtime_result[0].court_closemin;
     booking.court_state = bookingtime_result[0].court_state;
     booking.time_zone = bookingtime_result[0].time_zone;
     booking.club_id = bookingtime_result[0].club_id;
     
    
     return booking;

}

/**
 * 
 * @param {*} connection 
 * @param { string } end 
 * @param { string } start 
 * @param { number } court_id 
 * @param { string } date 
 * @returns { number [] }  An array of overlapping booking ids
 */
async function checkOverlap(connection,end,start,court_id,date){

    const overlap_result = await sqlconnector.runQuery(connection, overlap_check_q, [end,start,court_id,date]);

    if (! Array.isArray(overlap_result)) {
        throw new Error("Unable to check booking overlap");
    }

    return overlap_result.map((res) => res.id);

}


module.exports = {
    getBooking,
    insertBooking,
    getNewBooking,
    checkOverlap
}