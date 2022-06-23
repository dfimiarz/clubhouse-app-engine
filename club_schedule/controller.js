const sqlconnector = require('../db/SqlConnector');
const RESTError = require('./../utils/RESTError');

const CLUB_ID = process.env.CLUB_ID;

/**
 * Retrieves a list of club schedules for a given club_id
 */
async function getClubSchedules() {


    const connection = await sqlconnector.getConnection();


    const club_schedule_query = `SELECT cs.id,
                                    cs.club,
                                    cs.name,
                                    DATE_FORMAT(\`from\`,"%Y-%m-%d") as \`from\`,
                                    DATE_FORMAT(\`to\`,"%Y-%m-%d") as \`to\`,
                                    UNIX_TIMESTAMP(CONVERT_TZ(\`from\`,c.time_zone,@@GLOBAL.time_zone)) AS from_ms,
                                    UNIX_TIMESTAMP(CONVERT_TZ(\`to\`,c.time_zone,@@GLOBAL.time_zone)) AS to_ms
                                FROM 
                                    club_schedule cs
                                JOIN club c on c.id = cs.club
                                WHERE cs.club = ? 
                                ORDER by \`from\`
                                FOR SHARE`;

    const schedule_items_query=`SELECT
                                    schedule,
                                    court,
                                    dayofweek,
                                    open,
                                    close,
                                    time_to_sec(open) DIV 60 as open_min,
                                    time_to_sec(close) DIV 60 as close_min,
                                    message
                                FROM
                                    court_schedule_item
                                WHERE court in (SELECT id FROM court where club = ?)
                                ORDER BY court,open
                                FOR SHARE`;

    try {

        await sqlconnector.runQuery(connection, "START TRANSACTION", []);

        const schedules_result = await sqlconnector.runQuery(connection, club_schedule_query, [CLUB_ID])
        const item_result = await sqlconnector.runQuery(connection, schedule_items_query, [CLUB_ID])

        await sqlconnector.runQuery(connection, "COMMIT", [])

        return schedules_result.map((schedule) => {
            return {
                id: schedule["id"],
                club: schedule["club"],
                name: schedule["name"],
                from: schedule["from"],
                from_ms: schedule["from_ms"],
                to: schedule["to"],
                to_ms: schedule["to_ms"],
                message: schedule["message"],
                items: item_result.filter((item) => item.schedule === schedule["id"])
            }
        });


    }
    catch (error) {
        console.log(error)
        //TO DO: Add logging
        throw new RESTError(500, "Failed fetching club schedules");
    }
    finally {
        connection.release()
    }

}

module.exports = {
    getClubSchedules
}
