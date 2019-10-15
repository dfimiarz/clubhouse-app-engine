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

/**
 * 
 * @param { int } Session id 
 */
async function getMatchDetails(id){

    let query = `SELECT
                    JSON_OBJECT('id', a.id, 'updated' , a.updated ,'start', a.start, 'end' , a.end , 'court' , a.court, 'bumpable', bumpable , 'notes', a.notes , 'time' , convert_tz(now(),'UTC',cl.time_zone) ,'players', p.players) as 'match'
                FROM 
                    activity a
                JOIN court c ON a.court = c.id 
                JOIN club cl ON cl.id = c.club  
                LEFT JOIN (
                    SELECT activity,cast(concat('[',group_concat(json_object('id',person,'repeater',player.type,'firstname',p.firstname,'lastname',p.lastname)),']') as JSON) as players 
                    FROM player
                    join person p on p.id = player.person
                    GROUP BY activity ) p 
                ON a.id = p.activity
                WHERE a.id = ?`;

    const connection = await sqlconnector.getConnection()

    try{
        return await sqlconnector.runQuery(connection,query,[id])
    }
    catch( error ){
        throw new Error( error.sqlMessage )
    }
    finally{
        connection.release()
    }

}

module.exports = {
    addMatch: addMatch,
    getMatchesForDate: getMatchesForDate,
    getMatchDetails: getMatchDetails
}