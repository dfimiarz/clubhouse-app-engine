const sqlconnector = require('../db/SqlConnector')

/**
 * 
 * @param { Request } request 
 */
async function getCourts( request ){

    
    const connection = await sqlconnector.getConnection()
    const query = `SELECT * FROM court`
    try{
        const nestboxes = await sqlconnector.runQuery(connection,query)
        return nestboxes
    }
    catch(error){
        throw error
    }
    finally{
        connection.release()
    }
    
}

module.exports = {
    getCourts: getCourts
}
