const sqlconnector = require('../db/SqlConnector')
const { hasEndPermission, hasRemovePermission, hasChangeEndPermission, hasChangeStartPermission, hasCreatePermission } = require('../permissions/MatchPermissions')


async function endSession(id,cmd){

    const connection = await sqlconnector.getConnection()

    const activity_query = `SELECT
                    a.id,
                    UNIX_TIMESTAMP(convert_tz(concat(a.date,' ',a.start),cl.time_zone,@@GLOBAL.time_zone )) as utc_start, 
                    UNIX_TIMESTAMP(convert_tz(concat(a.date,' ',a.end),cl.time_zone,@@GLOBAL.time_zone )) as utc_end,
                    cl.time_zone
                    FROM activity a
                    JOIN court c ON a.court = c.id
                    JOIN club cl ON cl.id = c.club
                    WHERE a.id = ? and MD5(a.updated) = ? and active = 1
                    FOR UPDATE
                `

    const update_activity_q = `UPDATE activity SET end = TIME(convert_tz(from_unixtime(?),@@GLOBAL.time_zone,? )) where id = ?`

    try{
        await sqlconnector.runQuery(connection,"START TRANSACTION",[])

        try {
            const activity_res = await sqlconnector.runQuery(connection,activity_query,[id,cmd.hash])

            //console.log(activity_res)

            if (activity_res.length !== 1){
                throw new Error("Session not found or modified")
            } 

            let match = activity_res[0]
            let now = new Date()

            if( ! hasEndPermission(match,now)){
                throw new Error("Permission denied")
            }

            await sqlconnector.runQuery(connection,update_activity_q,[Math.floor(now.getTime() / 1000),match.time_zone,id])

            await sqlconnector.runQuery(connection,"COMMIT",[])
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
                    UNIX_TIMESTAMP(convert_tz(concat(a.date,' ',a.start),cl.time_zone,@@GLOBAL.time_zone )) as utc_start, 
                    UNIX_TIMESTAMP(convert_tz(concat(a.date,' ',a.end),cl.time_zone,@@GLOBAL.time_zone )) as utc_end
                 FROM activity a
                 JOIN court c ON a.court = c.id
                 JOIN club cl ON cl.id = c.club
                 WHERE a.id = ? and MD5(a.updated) = ? and active = 1
                 FOR UPDATE
                `

    const remove_activity_q = `UPDATE activity SET active = 0 where id = ?`

    const connection = await sqlconnector.getConnection()

    try{
        await sqlconnector.runQuery(connection,"START TRANSACTION",[])

        try {
            const activity_res = await sqlconnector.runQuery(connection,activity_query,[id,cmd.hash])

            if (activity_res.length !== 1){
                throw new Error("Session not found or modified")
            } 

            let match = activity_res[0]
            let now = new Date()

            if( ! hasRemovePermission(match,now)){
                throw new Error("Remove permission denied")
            }

            await sqlconnector.runQuery(connection,remove_activity_q,[id])

            await sqlconnector.runQuery(connection,"COMMIT",[])
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
                    UNIX_TIMESTAMP(convert_tz(concat(a.date,' ',?),cl.time_zone,@@GLOBAL.time_zone )) as utc_new_end
                 FROM activity a
                 JOIN court c ON a.court = c.id
                 JOIN club cl ON cl.id = c.club
                 WHERE a.id = ? and MD5(a.updated) = ? and active = 1
                `
    const change_time_q = `CALL changeActivityTime(?,?,?)`
            
    const connection = await sqlconnector.getConnection()

    const new_start = cmd.start
    const new_end = cmd.end

    try{

        //Get current and new session times
        const activity_res = await sqlconnector.runQuery(connection,activity_query,[new_start,new_end,id,cmd.hash])

        if (activity_res.length !== 1){
            throw new Error("Session not found or modified")
        } 

        activity_res[0]
        
        //Extract times for the new and current activity
        let cur_activity = (({ utc_start, utc_end  }) => ({ utc_start, utc_end }))(activity_res[0]);
        let new_activity = (({ utc_new_start, utc_new_end  }) => ({ utc_start : utc_new_start, utc_end : utc_new_end }))(activity_res[0]);

        //Check if start time and end times are the same
        if( 
            (cur_activity.utc_start === new_activity.utc_start) && 
            (cur_activity.utc_end === new_activity.utc_end)
        ){
            throw new Error("New time and the original time are the same")
        }

        //Check if start is changing and, if so, check permission
        if( cur_activity.utc_start !== new_activity.utc_start ){
            if( ! hasChangeStartPermission(cur_activity) ){
                throw new Error("Change start permission denied")
            }
        }

        //Check if end is changing and, if so, check permission
        if( cur_activity.utc_end !== new_activity.utc_end ){
            if( ! hasChangeEndPermission(cur_activity) ){
                throw new Error("Change start permission denied")
            }
        }

        await sqlconnector.runQuery(connection,change_time_q,[id,new_start,new_end])
        
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
    changeSessionTime
}

/* Psuedocode for updating session time
start transaction

get session for update

check permissions

---- stored procedure ----
change_session_time(session_id,start,end){

	get_lock('schedule_lock')

	
	check for overlap

	change time
		


	release_lock('schedule_lock')


}
----- end stored procedure

commit or rollback
 */