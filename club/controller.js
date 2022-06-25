const sqlconnector = require('../db/SqlConnector');
const RESTError = require('./../utils/RESTError');

const CLUB_ID = process.env.CLUB_ID;

/**
 * Retrieves a list of club schedules for a given club_id
 */
async function getClubInfo() {


    const club_query = `SELECT 
                            id,
                            name,
                            time_zone,
                            guest_reg_limit,
                            default_cal_start,
                            default_cal_end,
                            time_to_sec(default_cal_start) DIV 60 as default_cal_start_min,
                            time_to_sec(default_cal_end) DIV 60 as default_cal_end_min
                        FROM 
                            club
                        WHERE id = ?`;

    const connection = await sqlconnector.getConnection();

    try {

        const club_results = await sqlconnector.runQuery(connection, club_query, [CLUB_ID]);

        if( !Array.isArray(club_results) && club_results.length != 1 ){
            throw new Error("Unable to load club data");
        }

        const club = club_results[0];

        return {
            id: club["id"],
            name: club["name"],
            time_zone: club["time_zone"],
            guest_req_limit: club["guest_req_limit"],
            default_cal_start: club["default_cal_start"],
            default_cal_start_min: club["default_cal_start_min"],
            default_cal_end: club["default_cal_end"],
            default_cal_end_min: club["default_cal_end_min"],
        }


    }
    catch (error) {
        console.log(error)
        //TO DO: Add logging
        throw new RESTError(500, "Failed loading club info");
    }
    finally {
        connection.release()
    }

}

module.exports = {
    getClubInfo
}
