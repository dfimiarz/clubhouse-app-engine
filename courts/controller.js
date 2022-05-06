const sqlconnector = require('../db/SqlConnector')

const CLUB_ID = process.env.CLUB_ID;

/**
 * 
 * @param { Request } request 
 */
async function getCourts( request ){

    
    const connection = await sqlconnector.getConnection()
    const query = `SELECT * FROM court WHERE club = ?`
    try{

        const courts = await sqlconnector.runQuery(connection,query,[CLUB_ID])
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
    getCourts: getCourts
}
