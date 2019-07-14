const sqlconnector = require('../db/SqlConnector')

/**
 * 
 * @param { Request } request 
 */
async function addMatch( request ){

    
    const players = request.body.players
    const court = request.body.court
    const starttime = request.body.starttime
    const endtime = request.body.endtime
    const note = request.body.note

    const connection = await sqlconnector.getConnection()
    
    try{
        await sqlconnector.runQuery(connection,"LOCK TABLE `activity` WRITE, `player` WRITE")
        
        try {
            await sqlconnector.runQuery(connection,`call addMatch(?,?,?,?,?)`,[court,starttime,endtime,JSON.stringify(players),note])
        }
        catch(error){
            throw error
        }
        finally {
            try {
                await sqlconnector.runQuery(connection,"UNLOCK TABLES")
            }
            catch( error ) {
                throw error
            }
        }
    }
    catch(error){
        throw new Error( error.sqlMessage )
    }
    finally{
        connection.release()
    }
}

module.exports = {
    addMatch: addMatch
}