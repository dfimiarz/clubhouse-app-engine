const dayjs = require('dayjs');
const sqlconnector = require('../db/SqlConnector');
const { log, appLogLevels } = require('./../utils/logger/logger');
const RESTError = require('./../utils/RESTError');

const CLUB_ID = process.env.CLUB_ID;

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
const playerStatsProcessor = async (name, from, to) => {

    const time_played_q =
        `select 
        DATE_FORMAT(a.date,GET_FORMAT(DATE,'ISO')) as date,
        sum(round((time_to_sec(a.end)-time_to_sec(a.start))/60,2)) as time_played,
        count(distinct(p.person)) as player_count
    from 
        participant p
        join person pr on pr.id = p.person 
        join activity a on p.activity = a.id 
        join activity_type at on at.id = a.type 
        join activity_group ag on ag.id = at.group
    where 
        ag.id = 1 and 
        active = 1
        and a.date between ? and ?
        and pr.club = ?
    group by a.date`;

    const connection = await sqlconnector.getConnection();

    try {

        const result = await sqlconnector.runQuery(connection, time_played_q, [from, to, CLUB_ID]);

        if (!Array.isArray(result)) {
            throw new Error("Unable to retrieve report data");
        }

        //get dates between from and to in a map
        const resultMap = getDateMap(from, to, {time_played: 0, player_count: 0});

        //put data in stats map
        result.forEach(row => {
            resultMap.set(row.date, { time_played: row.time_played, player_count: row.player_count });
        });

        //return sorted stats as an array
        return Array.from(resultMap, ([date, value]) => ({ date: date, time_played: value.time_played, player_count: value.player_count }));

    } catch (err) {
        log(appLogLevels.ERROR, `Error generating report '${name}': ${err.message}`);
        throw new RESTError(500, "Request failed");

    } finally {
        connection.release();
    }

}

/**
 * 
 * @param {string} startDate ISO8601 date string
 * @param {string} endDate ISO8601 date string
 * @param {Object|Number} initialValue Initial value for the map
 * @returns {Map} A map of ordered dates between startDate and endDate with the following properties:
 *  - {string} date Date in ISO format
 *  - {Object|Number} initialValue Initial value for the map
 */
function getDateMap(startDate, endDate, initialValue = 0) {
    const dates = new Map();

    //loop through dates betwen startDate and endDate
    var theDate = dayjs(startDate).valueOf();
    const finalDate = dayjs(endDate).valueOf();

    while (theDate <= finalDate) {
        //add date to map
        dates.set(dayjs(theDate).format('YYYY-MM-DD'), initialValue);
        //add 1 day
        theDate = dayjs(theDate).add(1, 'day').valueOf();
    }

    return dates;
}

const memberActivitiesProcessor = async function (name, from, to) {
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
        a.active = 1 
        AND ag.id = 1
        AND a.date BETWEEN ? AND ?
        AND pr.club = ?
    ORDER BY date , start`;

    const connection = await sqlconnector.getConnection();

    try {

        const result = await sqlconnector.runQuery(connection, activities_q, [from, to, CLUB_ID]);

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
        log(appLogLevels.ERROR, `Error generating report '${name}': ${err.message}`)
        throw new RESTError(500, "Request failed");

    } finally {
        connection.release();
    }

}

/**
 * 
 * @param {String} name Processor name
 * @param {String} from Date in ISO format
 * @param {String} to Date in ISO format
 * @returns 
 */
const guestPassesProcessor = async function (name, from, to) {

    //Add begining and end of day to from and to
    const from_dt = dayjs(from).startOf('day').format('YYYY-MM-DDTHH:mm:ss');
    const to_dt = dayjs(to).endOf('day').format('YYYY-MM-DDTHH:mm:ss');

    const passes_q =
        `SELECT 
            gp.id,
            UNIX_TIMESTAMP(gp.created) as created_utc,
            DATE_FORMAT(CONVERT_TZ(gp.created,'UTC',c.time_zone),'%m/%d/%y %h:%i %p') as created,
            DATE_FORMAT(valid_from, '%m/%d/%y %h:%i %p') as valid_from,
            DATE_FORMAT(valid_to, '%m/%d/%y %h:%i %p') as valid_to,
            concat(host.firstname," ",host.lastname) as host,
            concat(guest.firstname," ",guest.lastname) as guest,
            gp.type as pass_type_id,
            guest_pass_type.label as pass_type_label
        FROM guest_pass gp
        JOIN person as guest on gp.guest_id = guest.id
        JOIN person as host on gp.member_id = host.id
        JOIN guest_pass_type on gp.type = guest_pass_type.id
        JOIN club c on host.club = c.id
        WHERE 
            valid_from < ? AND valid_to > ?
            AND valid = 1
            AND host.club = ? 
        ORDER BY gp.created DESC`;

        const connection = await sqlconnector.getConnection();

        try {
    
            const result = await sqlconnector.runQuery(connection, passes_q, [to_dt, from_dt, CLUB_ID]);
    
            if (!Array.isArray(result)) {
                throw new Error("Unable to retrieve report data");
            }
    
            return result.map(row => {
                return {
                    pass_id: row.id,
                    created: row.created,
                    created_utc: row.created_utc,
                    valid_from: row.valid_from,
                    valid_to: row.valid_to,
                    host: row.host,
                    guest: row.guest,
                    pass_type_id: row.pass_type_id,
                    pass_type_label: row.pass_type_label
                }
            });
    
        } catch (err) {
            log(appLogLevels.ERROR, `Error generating report '${name}': ${err.message}`);
            throw new RESTError(500, "Request failed");
    
        } finally {
            connection.release();
        }
}





module.exports = {
    playerStatsProcessor,
    memberActivitiesProcessor,
    guestPassesProcessor,

}