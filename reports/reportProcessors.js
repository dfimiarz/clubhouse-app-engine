const dayjs = require('dayjs');
const sqlconnector = require('../db/SqlConnector');
const { cloudLog, localLog, cloudLogLevels: loglevels } = require('./../utils/logger/logger');
const RESTError = require('./../utils/RESTError');


/**
 *  @param {string} name Report name
 *  @param {string} from Date in ISO format
 *  @param {string} to Date in ISO format
 *  @returns {Object}   Object with the following properties:
 *  - {string} from Date in ISO format
 *  - {string} to Date in ISO format
 *  - {string} type Report type  
 *  
 */
timePlayedProcessor = async (name, from, to) => {

    const time_played_q =
        `select 
        DATE_FORMAT(a.date,GET_FORMAT(DATE,'ISO')) as date,
        sum(round((time_to_sec(a.end)-time_to_sec(a.start))/60,2)) as value 
    from 
        participant p 
        join activity a on p.activity = a.id 
        join activity_type at on at.id = a.type 
        join activity_group ag on ag.id = at.group
    where 
        ag.id = 1 and 
        active = 1
        and a.date between ? and ?
    group by a.date`;

    const connection = await sqlconnector.getConnection();

    try {

        const result = await sqlconnector.runQuery(connection, time_played_q, [from, to]);

        if (!Array.isArray(result)) {
            throw new Error("Unable to retrieve report data");
        }

        //get dates between from and to in a map
        const resultMap = getDateMap(from, to);

        //put data in stats map
        result.forEach(row => {
            resultMap.set(row.date, row.value);
        });

        //return sorted stats as an array
        return Array.from(resultMap, ([date, value]) => ({ date, value }));

    } catch (err) {
        cloudLog(loglevels.error, `Error generating report '${name}': ${err.message}`);
        throw new RESTError(500, "Request failed");

    } finally {
        connection.release();
    }

}

playerCountsProcessor = async (name, from, to) => {

    const player_counts_q =
        `select 
            DATE_FORMAT(a.date,GET_FORMAT(DATE,'ISO')) as date, 
            count(distinct(person)) as value 
        from 
            participant p join 
            activity a on p.activity = a.id join 
            activity_type at on at.id = a.type join 
            activity_group ag on ag.id = at.group
        where 
            ag.id = 1 and 
            active = 1 and 
            a.date between ? and ?
        group by a.date`;

    const connection = await sqlconnector.getConnection();

    try {

        const result = await sqlconnector.runQuery(connection, player_counts_q, [from, to]);

        if (!Array.isArray(result)) {
            throw new Error("Unable to retrieve report data");
        }

        //get dates between from and to in a map
        const resultMap = getDateMap(from, to);

        //put data in stats map
        result.forEach(row => {
            resultMap.set(row.date, row.value);
        });

        //return sorted stats as an array
        return Array.from(resultMap, ([date, value]) => ({ date, value }));

    } catch (err) {
        cloudLog(loglevels.error, `Error generating report '${name}': ${err.message}`);
        throw new RESTError(500, "Request failed");

    } finally {
        connection.release();
    }


}

/**
 * 
 * @param {string} startDate ISO8601 date string
 * @param {string} endDate ISO8601 date string
 * @returns {Map} A map of ordered dates between startDate and endDate with the following properties:
 *  - {string} date Date in ISO format
 *  - {number} total_min_played Total minutes played
 */
function getDateMap(startDate, endDate) {
    const dates = new Map();

    //loop through dates betwen startDate and endDate
    var theDate = dayjs(startDate).valueOf();
    const finalDate = dayjs(endDate).valueOf();

    while (theDate <= finalDate) {
        //add date to map
        dates.set(dayjs(theDate).format('YYYY-MM-DD'), 0);
        //add 1 day
        theDate = dayjs(theDate).add(1, 'day').valueOf();
    }

    return dates;
}

memberActivitiesProcessor = async function (name, from, to) {
    const activities_q =
        `SELECT 
        p.id AS participant_id,
        a.id AS activity_id,
        c.name AS court,
        person_type.lbl AS person_type,
        DATE_FORMAT(a.date, GET_FORMAT(DATE, 'ISO')) AS date,
        a.start,
        a.end,
        ROUND((TIME_TO_SEC(end) - TIME_TO_SEC(start)) / 60,
                2) AS dur_min,
        CONCAT(pr.firstname, ' ', pr.lastname) AS player,
        pt.desc AS player_type
    FROM
        activity a
            JOIN
        participant p ON p.activity = a.id
            JOIN
        person pr ON pr.id = p.person
            JOIN
        participant_type pt ON pt.id = p.type
            JOIN
        court c ON c.id = a.court
            JOIN
        activity_type at ON at.id = a.type
            JOIN
        activity_group ag ON ag.id = at.group
            JOIN
        person_type ON person_type.id = pr.type
    WHERE
        a.active = 1 AND ag.id = 1
            AND a.date BETWEEN ? AND ?
    ORDER BY date , start`;

    const connection = await sqlconnector.getConnection();

    try {

        const result = await sqlconnector.runQuery(connection, activities_q, [from, to]);

        if (!Array.isArray(result)) {
            throw new Error("Unable to retrieve report data");
        }

        return result.map(row => {
            return {
                participant_id: row.participant_id,
                activity_id: row.activity_id,
                court: row.court,
                date: row.date,
                start: row.start,
                end: row.end,
                dur_min: row.dur_min,
                player: row.player,
                person_type: row.person_type,
                player_type: row.player_type
            }
        });

    } catch (err) {
        cloudLog(loglevels.error, `Error generating report '${name}': ${err.message}`);
        throw new RESTError(500, "Request failed");

    } finally {
        connection.release();
    }

}

guestInfoProcessor = async function (name, from, to) {

    const guest_activity_q =
        `SELECT 
            ga.id as activation_id,
            DATE_FORMAT(ga.active_date, GET_FORMAT(DATE, 'ISO')) AS active_date,
            concat(host.firstname," ",host.lastname) as host,
            concat(guest.firstname," ",guest.lastname) as guest
        FROM 
            guest_activation ga JOIN
            person as host on host.id = ga.member JOIN
            person as guest on guest.id = ga.guest
        WHERE
            status = 1 and
            active_date between ? and ?`;

        const connection = await sqlconnector.getConnection();

        try {
    
            const result = await sqlconnector.runQuery(connection, guest_activity_q, [from, to]);
    
            if (!Array.isArray(result)) {
                throw new Error("Unable to retrieve report data");
            }
    
            return result.map(row => {
                return {
                    activation_id: row.activation_id,
                    active_date: row.active_date,
                    host: row.host,
                    guest: row.guest
                }
            });
    
        } catch (err) {
            cloudLog(loglevels.error, `Error generating report '${name}': ${err.message}`);
            throw new RESTError(500, "Request failed");
    
        } finally {
            connection.release();
        }
}





module.exports = {
    timePlayedProcessor,
    playerCountsProcessor,
    memberActivitiesProcessor,
    guestInfoProcessor,

}