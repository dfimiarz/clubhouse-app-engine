const sqlconnector = require('../db/SqlConnector')

/**
 * 
 * @param { Request } request 
 */
async function getMembers( request ){

    
    const connection = await sqlconnector.getConnection()
    const query = `SELECT p.id as id,firstname,lastname,pt.lbl as role,email FROM person p
                    join person_type pt on p.type = pt.id`
    try{

        const courts = await sqlconnector.runQuery(connection,query)
        return courts
    }
    catch(error){
        throw error
    }
    finally{
        connection.release()
    }
    
}

module.exports = {
    getMembers: getMembers
}
