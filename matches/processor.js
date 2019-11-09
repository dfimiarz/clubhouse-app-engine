const sqlconnector = require('../db/SqlConnector')
const { hasEndPermission, hasRemovePermission, checkChangeTimePermissions, hasChangeCourtPermission } = require('./permissions/MatchPermissions')


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
                    UNIX_TIMESTAMP(convert_tz(concat(a.date,' ',?),cl.time_zone,@@GLOBAL.time_zone )) as utc_new_end,
                    a.court,
                    a.date
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
                    a.court,
                    a.date
                    FROM activity a
                    JOIN court c ON a.court = c.id
                    JOIN club cl ON cl.id = c.club
                    WHERE a.id = ? and MD5(a.updated) = ? and active = 1
                    FOR UPDATE
                    `
    const full_update_query = `UPDATE activity SET court = ? 
                               WHERE id = ? and MD5(updated) = ?
                              `

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
            
            //Use current time as the bases for checking permissions
            let curr_time = new Date()

            //Extract start,end and court for current activity
            let curr_activity = (({ utc_start, utc_end, court  }) => ({ utc_start, utc_end,court }))(activity_res[0]);

            console.log(curr_activity,curr_time.getTime())

            if( ! hasChangeCourtPermission(curr_activity,curr_time)){
                throw new Error("Permission to change court denied")
            }
        
            if( curr_activity.court === new_court ){
                throw new Error("Original court number and new are the same")
            }

            if( (curr_activity.utc_start * 1000) > curr_time.getTime() ){
                //Session is in the future so change the court right away
                console.log("Running full update")
                await sqlconnector.runQuery(connection,full_update_query,[new_court,id,hash])
            }
            else{

            }

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

module.exports = {
    endSession,
    removeSession,
    changeSessionTime,
    changeCourt,
}