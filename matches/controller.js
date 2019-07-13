const sqlconnector = require('../db/SqlConnector')

/**
 * 
 * @param { Request } request 
 */
async function addMatch( request ){

    
    const players = request.body.players
    const court = 1
    const starttime = "2019-01-01 12:30:00"
    const endtime = "2019-01-10 12:45:00"
    const note = ""


    console.log(JSON.stringify(players))

    const connection = await sqlconnector.getConnection()
    
    try{

        await sqlconnector.runQuery(connection,"LOCK TABLE `activity` WRITE, `player` WRITE")

        await sqlconnector.runQuery(connection,`call addMatch(?,?,?,?,?)`,[court,starttime,endtime,JSON.stringify(players),note])

        await sqlconnector.runQuery(connection,"UNLOCK TABLES")

    }
    catch(error){
        throw error
    }
    finally{
        connection.release()
    }
    
}

module.exports = {
    addMatch: addMatch
}