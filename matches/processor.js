const sqlconnector = require('../db/SqlConnector')
const { hasEndPermission, hasRemovePermission } = require('../permissions/MatchPermissions')


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

    console.log("In remove")
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

module.exports = {
    endSession,
    removeSession
}