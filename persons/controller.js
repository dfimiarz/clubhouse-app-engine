const sqlconnector = require('../db/SqlConnector')
const club_id = process.env.CLUB_ID;
const SQLErrorFactory = require('./../utils/SqlErrorFactory');

/**
 * 
 * @param { Request } request 
 */
async function getMembers(request) {


    const connection = await sqlconnector.getConnection()
    const query = `SELECT id,CONCAT(firstname,' ',lastname) as name,firstname,lastname,type_id,role,email,UNIX_TIMESTAMP(convert_tz(valid_until,time_zone,@@GLOBAL.time_zone )) as active_until FROM members_view`
    try {

        const members = await sqlconnector.runQuery(connection, query)
        return members
    }
    catch (error) {
        throw error
    }
    finally {
        connection.release()
    }

}

/**
 * Returns a list of club members and guests that are eligible to play
 */
async function getEligiblePersons() {

    const connection = await sqlconnector.getConnection()
    const query = `SELECT * FROM active_members
                   UNION
                   SELECT * FROM active_guests;`
    try {

        const persons = await sqlconnector.runQuery(connection, query)
        return persons
    }
    catch (error) {
        throw error
    }
    finally {
        connection.release()
    }

}


/**
 * 
 * @param { Request } request 
 */
async function getGuests(request) {

    const connection = await sqlconnector.getConnection()
    const query = `SELECT id,CONCAT(firstname,' ',lastname) as name,firstname,lastname,type_id,role,email,UNIX_TIMESTAMP(convert_tz(valid_until,time_zone,@@GLOBAL.time_zone )) as active_until FROM members_view`
    try {

        const courts = await sqlconnector.runQuery(connection, query)
        return courts
    }
    catch (error) {
        throw error
    }
    finally {
        connection.release()
    }

}

async function addGuest(request) {

    const OPCODE = "ADD_GUEST";

    const firstname = request.body.firstname;
    const lastname = request.body.lastname;
    const email = request.body.email;
    const phone = request.body.phone;
    const guest_type = 2;


    const query = "INSERT INTO `person` (`type`,`club`,`created`,`firstname`,`lastname`,`email`,`phone`,`gender`) VALUES (?,?,now(),?,?,?,?,DEFAULT)";

    const connection = await sqlconnector.getConnection();

    try {

        await sqlconnector.runQuery(connection, query, [guest_type, club_id, firstname, lastname, email, phone])

    }
    catch (error) {

        throw new SQLErrorFactory.getError(OPCODE, error)
    }
    finally {
        connection.release()
    }

}

async function getPersons() {

    const connection = await sqlconnector.getConnection()
    const query = `SELECT * from person`
    try {

        const persons = await sqlconnector.runQuery(connection, query)
        return persons
    }
    catch (error) {
        throw error
    }
    finally {
        connection.release()
    }
}

module.exports = {
    getMembers: getMembers,
    getGuests: getGuests,
    addGuest: addGuest,
    getEligiblePersons,
    getPersons
}
