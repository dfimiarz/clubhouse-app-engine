const sqlconnector = require('../db/SqlConnector')
const club_id = process.env.CLUB_ID;

/**
 * 
 * @param { Request } request 
 */
async function getBookingTypes(request) {


    const connection = await sqlconnector.getConnection()
    const query = `SELECT * from activity_type`;
    try {

        const booking_types = await sqlconnector.runQuery(connection, query)
        return booking_types;
    }
    catch (error) {
        throw error
    }
    finally {
        connection.release()
    }

}

module.exports = {
    getBookingTypes
}