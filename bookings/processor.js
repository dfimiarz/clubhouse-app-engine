const sqlconnector = require('../db/SqlConnector')
const { hasEndPermission, hasRemovePermission, checkChangeTimePermissions, hasChangeCourtPermission } = require('./permissions/MatchPermissions')
const RESTError = require('./../utils/RESTError');
const { validateBooking } = require('./permissions/BookingPermissions');

const CLUB_ID = process.env.CLUB_ID;

const activity_q = `SELECT
                    c.id as court,
                    UNIX_TIMESTAMP(convert_tz(concat(a.date,' ',a.start),cl.time_zone,@@GLOBAL.time_zone )) as utc_start, 
                    UNIX_TIMESTAMP(convert_tz(concat(a.date,' ',a.end),cl.time_zone,@@GLOBAL.time_zone )) as utc_end,
                    UNIX_TIMESTAMP(convert_tz(?,cl.time_zone,@@GLOBAL.time_zone )) as utc_day_start,
                    UNIX_TIMESTAMP(now()) as utc_req_time,
                    CAST(convert_tz(now(),@@GLOBAL.time_zone,cl.time_zone) as DATE) + 0 as loc_req_date,
                    a.date as booking_date,
                    a.active,
                    a.type,
                    a.bumpable,
                    a.created,
                    a.updated,
                    c.openmin as court_open,
                    c.closemin as court_close,
                    c.state as court_state
                    FROM activity a 
                    JOIN court c on a.court = c.id 
                    JOIN club cl ON cl.id = c.club
                    WHERE a.id = ? AND MD5(a.updated) = ?
                    FOR UPDATE`


async function endSession(id,cmd){

    const connection = await sqlconnector.getConnection()

    // const activity_query = `SELECT
    //                 a.id,
    //                 DATE_FORMAT(a.date,'%Y-%m-%d') as booking_date,
    //                 UNIX_TIMESTAMP(convert_tz(concat(a.date,' ',a.start),cl.time_zone,@@GLOBAL.time_zone )) as utc_start, 
    //                 UNIX_TIMESTAMP(convert_tz(concat(a.date,' ',a.end),cl.time_zone,@@GLOBAL.time_zone )) as utc_end,
    //                 cl.time_zone
    //                 FROM activity a
    //                 JOIN court c ON a.court = c.id
    //                 JOIN club cl ON cl.id = c.club
    //                 WHERE a.id = ? and MD5(a.updated) = ? and active = 1
    //                 FOR UPDATE
    //             `

    //Time will be converted from UTC (server) to club time zone
    const update_activity_q = `UPDATE activity SET end = TIME(convert_tz(from_unixtime(?),@@GLOBAL.time_zone,? )) where id = ?`

    try{
        await sqlconnector.runQuery(connection,"START TRANSACTION",[])

        try {
            const activity_result = await sqlconnector.runQuery(connection,activity_q,[id,cmd.hash])

            if( activity_result.length !== 1 ) {
                throw new RESTError(422, "Failed to verify booking time");
            }

            let match = activity_result[0];

            console.log(match);


            const bookingParams = 
                {   
                    court: activity_result[0].court, 
                    utc_start: activity_result[0].utc_start, 
                    utc_end: activity_result[0].utc_end, 
                    utc_day_start: activity_result[0].utc_day_start,
                    utc_req_time: activity_result[0].utc_req_time,
                    local_req_date: activity_result[0].loc_req_date,
                    booking_date: activity_result[0].booking_date,
                    court_open: activity_result[0].court_open, 
                    court_closed: activity_result[0].court_close, 
                    courtstate: activity_result[0].court_state,
                    type: activity_result[0].type,
                    bumpable: activity_result[0].bumpable,
                    active: activity_result[0].active,
                    created: activity_result[0].created,
                    updated: activity_result[0].updated
                }

            console.log(bookingParams);

            //Check permissions
            const errors = validateBooking('end',bookingParams);
            if ( errors.length > 0 ){
                throw new RESTError(422, "Permission to end denied: " + errors[0]);
            }

            await sqlconnector.runQuery(connection,update_activity_q,[Math.floor(now.getTime() / 1000),match.time_zone,id])

            await sqlconnector.runQuery(connection,"COMMIT",[])

            return match.booking_date;
        }
        catch( err ){

            try{
                await sqlconnector.runQuery(connection,"ROLLBACK",[])
            }
            catch( err ){
                throw err
            }
            
            throw err
        }
    }
    catch( err ) {
        console.log(err)
        throw new Error( err )
    }
    finally
    {
        connection.release()
    }
}

async function removeSession(id,cmd){

    const activity_query = `SELECT
                    a.id,
                    a.date,
                    DATE_FORMAT(a.date,'%Y-%m-%d') as booking_date,
                    UNIX_TIMESTAMP(convert_tz(concat(a.date,' ',a.start),cl.time_zone,@@GLOBAL.time_zone )) as utc_start, 
                    UNIX_TIMESTAMP(convert_tz(concat(a.date,' ',a.end),cl.time_zone,@@GLOBAL.time_zone )) as utc_end,
                    a.type as type,
                    a.active as active,
                    a.court as court
                 FROM activity a
                 JOIN court c ON a.court = c.id
                 JOIN club cl ON cl.id = c.club
                 WHERE a.id = ? and MD5(a.updated) = ?
                 FOR UPDATE
                `

    const remove_activity_q = `UPDATE activity SET active = 0 where id = ?`

    const connection = await sqlconnector.getConnection()

    try{
        await sqlconnector.runQuery(connection,"START TRANSACTION",[])

        try {
            const activity_res = await sqlconnector.runQuery(connection,activity_query,[id,cmd.hash])

            if (! Array.isArray(activity_res) || activity_res.length !== 1){
                throw new Error("Session not found or modified")
            } 

            let match = activity_res[0];
            let now = new Date();

            if( ! hasRemovePermission(match,now)){
                throw new Error("Remove permission denied")
            }

            await sqlconnector.runQuery(connection,remove_activity_q,[id])

            await sqlconnector.runQuery(connection,"COMMIT",[])

            return match.booking_date;
        }
        catch( err ){

            try{
                await sqlconnector.runQuery(connection,"ROLLBACK",[])
            }
            catch( err ){
                throw err
            }
            
            throw err
        }
    }
    catch( err ){
        throw err
    }
    finally{
        connection.release()
    }

    
}

async function changeSessionTime(id,cmd){
    const activity_query = `SELECT
                    a.id,
                    UNIX_TIMESTAMP(convert_tz(concat(a.date,' ',a.start),cl.time_zone,@@GLOBAL.time_zone )) as utc_start, 
                    UNIX_TIMESTAMP(convert_tz(concat(a.date,' ',a.end),cl.time_zone,@@GLOBAL.time_zone )) as utc_end,
                    UNIX_TIMESTAMP(convert_tz(concat(a.date,' ',?),cl.time_zone,@@GLOBAL.time_zone )) as utc_new_start,
                    UNIX_TIMESTAMP(convert_tz(concat(a.date,' ',?),cl.time_zone,@@GLOBAL.time_zone )) as utc_new_end,
                    a.court,
                    a.date,
                    DATE_FORMAT(a.date,'%Y-%m-%d') as booking_date
                 FROM activity a
                 JOIN court c ON a.court = c.id
                 JOIN club cl ON cl.id = c.club
                 WHERE a.id = ? and MD5(a.updated) = ? and active = 1
                 FOR UPDATE
                `
    const change_time_q = `CALL changeActivityTime(?,?,?,?,?,?)`
            
    const connection = await sqlconnector.getConnection()

    const new_start = cmd.start
    const new_end = cmd.end

    try{

        await sqlconnector.runQuery(connection,"START TRANSACTION",[])

        try{
            //Get current and new session times
            const activity_res = await sqlconnector.runQuery(connection,activity_query,[new_start,new_end,id,cmd.hash])

            if (activity_res.length !== 1){
                throw new Error("Session not found or modified")
            } 
            
            //Use current time as the bases for checking permissions
            let curr_time = new Date()

            //Extract times for the new and current activity
            let cur_activity = (({ utc_start, utc_end  }) => ({ utc_start, utc_end }))(activity_res[0]);
            let new_activity = (({ utc_new_start, utc_new_end  }) => ({ utc_start : utc_new_start, utc_end : utc_new_end }))(activity_res[0]);

            const errmsg = checkChangeTimePermissions(cur_activity,new_activity)

            if ( errmsg ){
                throw new Error(errmsg)
            }

            let court = activity_res[0].court
            let date = activity_res[0].date

            await sqlconnector.runQuery(connection,change_time_q,[id,cmd.hash,court,date,new_start,new_end])

            await sqlconnector.runQuery(connection,"COMMIT",[])

            return activity_res[0].booking_date;
        }
        catch( err ){

            try{
                await sqlconnector.runQuery(connection,"ROLLBACK",[])
            }
            catch( err ){
                throw err
            }
            
            throw err
        }
    }
    catch( err ){
        throw err
    }
    finally{
        connection.release()
    }
}



async function changeCourt(id,cmd){


    const activity_query = `SELECT
                    a.id,
                    UNIX_TIMESTAMP(convert_tz(concat(a.date,' ',a.start),cl.time_zone,@@GLOBAL.time_zone )) as utc_start, 
                    UNIX_TIMESTAMP(convert_tz(concat(a.date,' ',a.end),cl.time_zone,@@GLOBAL.time_zone )) as utc_end,
                    TIME(convert_tz(NOW(),@@GLOBAL.time_zone, cl.time_zone )) as club_time,
                    UNIX_TIMESTAMP(NOW()) as utc_club_time,
                    a.start,
                    a.end,
                    a.court,
                    a.date,
                    DATE_FORMAT(a.date,'%Y-%m-%d') as booking_date,
                    a.bumpable,
                    a.notes,
                    a.type
                    FROM activity a
                    JOIN court c ON a.court = c.id
                    JOIN club cl ON cl.id = c.club
                    WHERE a.id = ? and MD5(a.updated) = ? and active = 1
                    FOR UPDATE
                    `
    //IN _id INT, IN _hash VARCHAR(32),IN _date DATE,IN _start TIME,IN _end TIME,IN _new_court INT
    const update_court_query = `call changeActivityCourt(?,?,?,?,?,?)`
    
    //IN _id INT, IN _hash VARCHAR(32),IN _date DATE,IN _start TIME, IN _end TIME, IN bumpable TINYINT, IN _notes VARCHAR(256),IN _split_time TIME,IN _new_court INT
    const split_move_query = `call splitAndMoveActivity(?,?,?,?,?,?,?,?,?,?)`

    const connection = await sqlconnector.getConnection()

    const new_court = cmd.court
    const hash = cmd.hash

    try{

        await sqlconnector.runQuery(connection,"START TRANSACTION",[])

        try{
            //Get current and new session times
            const activity_res = await sqlconnector.runQuery(connection,activity_query,[id,cmd.hash])

            if (activity_res.length !== 1){
                throw new Error("Session not found or modified")
            } 

            //Extract start,end and court for current activity
            let activity = (
                ({ utc_start, utc_end, court, date, start, end, club_time, utc_club_time, bumpable, notes,type,booking_date  }) => ({ utc_start, utc_end,court, date, start, end, club_time, utc_club_time, bumpable,notes,type,booking_date })
            )(activity_res[0]);

            let curr_time = new Date(activity.utc_club_time * 1000)

            if( ! hasChangeCourtPermission(activity,curr_time)){
                throw new Error("Permission to change court denied")
            }
        
            if( activity.court === new_court ){
                throw new Error("Court has not changed")
            }

            if( activity.utc_start  > activity.utc_club_time ){
                //Session is in the future so change the court right away
                await sqlconnector.runQuery(connection,update_court_query,[id,hash,activity.date,activity.start,activity.end,new_court])
            }
            else{
                //Current session. Split and move
                await sqlconnector.runQuery(connection,split_move_query,[id,hash,activity.date,activity.start,activity.end,activity.bumpable,activity.notes,activity.club_time,new_court,activity.type])
            }

            await sqlconnector.runQuery(connection,"COMMIT",[])

            return activity.booking_date;
        }
        catch( err ){

            try{
                await sqlconnector.runQuery(connection,"ROLLBACK",[])
            }
            catch( err ){
                throw err
            }
            
            throw err
        }
    }
    catch( err ){
        throw err
    }
    finally{
        connection.release()
    }

} 

module.exports = {
    endSession,
    removeSession,
    changeSessionTime,
    changeCourt,
}