const sqlconnector = require('../db/SqlConnector')
const { hasEndPermission, hasRemovePermission } = require('../permissions/MatchPermissions')
const { getProcessor } = require('./command')
const { MatchCommandProcessor } = require('./processor')

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
    const date = request.body.date
    const start = request.body.start
    const end = request.body.end
    const note = request.body.note
    const bumpable = request.body.bumpable

    console.log(new Date(date.concat(' ',start)))
    console.log(new Date(date.concat(' ',end)))
    console.log(new Date('2019-10-20T09:00:00').getTimezoneOffset())

    const connection = await sqlconnector.getConnection()
    
    try{
        await sqlconnector.runQuery(connection,"LOCK TABLE `activity` WRITE, `player` WRITE")
        
        try {
            await sqlconnector.runQuery(connection,`call addMatch(?,?,?,?,?,?,?)`,[court,date,start,end,bumpable,note,JSON.stringify(players)])
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
                    JSON_OBJECT(
                            'id', a.id, 
                            'updated' , MD5(a.updated), 
                            'date' , a.date  ,
                            'start', a.start, 
                            'end' , a.end , 
                            'court' , a.court, 
                            'bumpable', bumpable , 
                            'notes', a.notes , 
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
                WHERE a.id = ?
                and active = 1`;

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

/**
 * 
 * @param { Number } id 
 * @param { String } hash 
 */
async function endSession(id,hash){


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
            const activity_res = await sqlconnector.runQuery(connection,activity_query,[id,hash])

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

async function removeSession(id,hash){
    const activity_query = `SELECT
                    a.id,
                    UNIX_TIMESTAMP(convert_tz(concat(a.date,' ',a.start),cl.time_zone,@@GLOBAL.time_zone )) as utc_start, 
                    UNIX_TIMESTAMP(convert_tz(concat(a.date,' ',a.end),cl.time_zone,@@GLOBAL.time_zone )) as utc_end
                 FROM activity a
                 WHERE a.id = ? and MD5(a.updated) = ? and active = 1
                 FOR UPDATE
                `

    const remove_activity_q = `UPDATE activity SET active = 0 where id = ?`

    const connection = await sqlconnector.getConnection()

    try{
        await sqlconnector.runQuery(connection,"START TRANSACTION",[])

        try {
            const activity_res = await sqlconnector.runQuery(connection,activity_query,[id,hash])

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

    }
    finally{
        connection.release()
    }

    
}

function processCommand(id,cmd){

    const processor_name = getProcessor(cmd.name)

    if( typeof MatchCommandProcessor[processor_name] === "function" )
        return MatchCommandProcessor[processor_name](id,cmd.params)
    else    
        return Promise.reject("Command processor not found")
    
}

module.exports = {
    addMatch: addMatch,
    getMatchesForDate: getMatchesForDate,
    getMatchDetails: getMatchDetails,
    endSession: endSession,
    removeSession: removeSession,
    processCommand: processCommand
}