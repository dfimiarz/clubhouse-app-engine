const sqlconnector = require('../db/SqlConnector')

async function getMatchesForDate(date){

    if( date === null )
        return []

    const connection = await sqlconnector.getConnection()
    const query = `call getActivitiesForDate(?) `
    try{

        let matches_array = await sqlconnector.runQuery(connection,query,[date])
        
        return matches_array[0].map( matchinfo => matchinfo.match )
    }
    catch(error){
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

    
    const players = request.body.players
    const court = request.body.court
    const starttime = request.body.starttime
    const endtime = request.body.endtime
    const note = request.body.note
    const bumpable = request.body.bumpable

    const connection = await sqlconnector.getConnection()
    
    try{
        await sqlconnector.runQuery(connection,"LOCK TABLE `activity` WRITE, `player` WRITE")
        
        try {
            await sqlconnector.runQuery(connection,`call addMatch(?,?,?,?,?,?)`,[court,starttime,endtime,bumpable,note,JSON.stringify(players)])
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
    addMatch: addMatch,
    getMatchesForDate: getMatchesForDate
}