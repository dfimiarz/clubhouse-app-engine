const sqlconnector = require('../db/SqlConnector')
const { hasCreatePermission } = require('./permissions/MatchPermissions')
const { getProcessor } = require('./command')
const MatchCommandProcessors = require('./processor')

//Set default booking type to match. Sync with DB values if needed
const DEFAULT_BOOKING_TYPE = 1000;


async function getMatchesForDate(date){

    if( date === null )
        return []

    const connection = await sqlconnector.getConnection()
    const query = `call getBookingsForDate(?)`
    try{

        let bookings_array = await sqlconnector.runQuery(connection,query,[date])

        return bookings_array[0].map( bookingobj => JSON.parse(bookingobj.booking) )
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
    const bookingtype = request.body.bookingtype || DEFAULT_BOOKING_TYPE

    const session_time_q = `SELECT
                        c.id as court,
                        UNIX_TIMESTAMP(convert_tz(concat(?,' ',?),cl.time_zone,@@GLOBAL.time_zone )) as utc_start, 
                        UNIX_TIMESTAMP(convert_tz(concat(?,' ',?),cl.time_zone,@@GLOBAL.time_zone )) as utc_end
                        FROM court c 
                        JOIN club cl ON cl.id = c.club
                        WHERE c.id = ?`

    const connection = await sqlconnector.getConnection()
    
    try{
        let activity_result = await sqlconnector.runQuery(connection,session_time_q,[date,start,date,end,court])

        if( activity_result.length !== 1 ) {
            throw new Error("Failed to verify new session time")
        }

        if (! hasCreatePermission( activity_result[0] )){
            throw new Error("Create permission denied. Check time")
        }

        await sqlconnector.runQuery(connection,`call addMatch(?,?,?,?,?,?,?,?)`,[bookingtype,court,date,start,end,bumpable,note,JSON.stringify(players)])
    }
    catch(error){
        throw error
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
                            'type', at.desc ,
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
                JOIN activity_type at on at.id = a.type
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





/**
 * 
 * @param { Number } id Id of the object being processed
 * @param { Object } cmd 
 */
function processPatchCommand(id, cmd){

    const processor_name = getProcessor(cmd.name)

    if( typeof MatchCommandProcessors[processor_name] === "function" )
        return MatchCommandProcessors[processor_name](id,cmd.params)
    else    
        return Promise.reject(new Error("Unable to run command"))
    
}

module.exports = {
    addMatch: addMatch,
    getMatchesForDate: getMatchesForDate,
    getMatchDetails: getMatchDetails,
    processPatchCommand
}