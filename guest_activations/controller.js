const sqlconnector = require('../db/SqlConnector')
const club_id = process.env.CLUB_ID;
const SQLErrorFactory = require('./../utils/SqlErrorFactory');
const RESTError = require('./../utils/RESTError');

/**
 * 
 * @param {Number} member Id of member
 * @param {Number[]} guests Array of integer Ids for guests
 */
async function addGuestActivationsInBulk(member, guests) {

    //TO DO Move most queries to stored procedure for better performance

    const OPCODE = "ACTIVATE_GUESTS";

    if (!Array.isArray(guests)) {
        throw new RESTError(400, "Guest list error ")
    }

    const member_check_q = "SELECT club FROM active_members WHERE id = ? and club = ?";
    const guests_check_q = "SELECT club FROM inactive_guests WHERE id in ? and club = ?"
    const club_date_q = "SELECT CAST(convert_tz(now(),@@GLOBAL.time_zone,c.time_zone)  as DATE) as local_date from club c where c.id = ?";

    const connection = await sqlconnector.getConnection()

    try {

        //Get club timezone
        const local_club_date_res = await sqlconnector.runQuery(connection, club_date_q, club_id);

        if (!Array.isArray(local_club_date_res) || local_club_date_res.length !== 1) {
            throw new RESTError(400, "Club configuration error")
        }

        const local_club_date = local_club_date_res[0].local_date;

        //Check if the member is active and belongs to club defined in .env
        const m_club_res = await sqlconnector.runQuery(connection, member_check_q, [member, club_id]);

        if (!Array.isArray(m_club_res) || m_club_res.length !== 1) {
            throw new RESTError(400, "Member error")
        }

        //Check inactive guests belonging to the club
        const g_clubs_res = await sqlconnector.runQuery(connection, guests_check_q, [[guests], club_id]);

        if (!Array.isArray(g_clubs_res) || g_clubs_res.length !== guests.length) {
            throw new RESTError(400, "Guest list error ");
        }

        let guest_activations = guests.map((val) => {
            return [null, val, local_club_date, member, false];
        });

        const insert_q = "insert into guest_activation values ?"

        return await sqlconnector.runQuery(connection, insert_q, [guest_activations]);


    }
    catch (error) {

        throw error instanceof RESTError ? error : new SQLErrorFactory.getError(OPCODE, error)
    }
    finally {
        connection.release()
    }


}

/**
 * Return current activations for a given club
 */
async function getCurrentActivations() {

    const query = `select 
    a.created,
    concat(pm.firstname,' ',pm.lastname) as member,
    member as member_id,
    concat(pg.firstname,' ',pg.lastname) as guest,
    person as guest_id,
    cast(convert_tz(a.active_date,@@GLOBAL.time_zone,c.time_zone) as date) date_active, 
    isfamily 
    from guest_activation a 
    join club c on c.id = 1
    join person pg on pg.id = a.person and pg.club = c.id
    join person pm on pm.id = a.member and pm.club = c.id
    where 
    curtime() >= getDbTime(a.active_date,c.time_zone) and
    curtime() < getDbTime(DATE_ADD(a.active_date,INTERVAL 1 DAY),c.time_zone)`

    const connection = await sqlconnector.getConnection()

    try {

        const current_activations_result = await sqlconnector.runQuery(connection, query, [club_id])
        return current_activations_result
    }
    catch (error) {
        throw error
    }
    finally {
        connection.release()
    }
}

module.exports = {
    addGuestActivationsInBulk,
    getCurrentActivations
}