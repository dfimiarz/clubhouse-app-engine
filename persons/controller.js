const sqlconnector = require('../db/SqlConnector')
const club_id = process.env.CLUB_ID;
const SQLErrorFactory = require('./../utils/SqlErrorFactory');

/**
 * 
 * @returns {Promise<Array>} List of club members
 */
async function getMembers() {


    const connection = await sqlconnector.getConnection()
    const query = `SELECT id,CONCAT(firstname,' ',lastname) as name,firstname,lastname,type_id,role,email,UNIX_TIMESTAMP(convert_tz(valid_until,time_zone,@@GLOBAL.time_zone )) as active_until FROM members_view`
    try {

        const members = await sqlconnector.runQuery(connection, query)
        return members
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
                   SELECT * FROM active_guests`
    try {

        const persons = await sqlconnector.runQuery(connection, query)
        return persons
    }
    finally {
        connection.release()
    }

}

/**
 * Returns a list of club members elgible to play
 */
async function getActiveMembers() {

    const connection = await sqlconnector.getConnection()
    const query = `SELECT * FROM active_members`
    try {

        const persons = await sqlconnector.runQuery(connection, query)
        return persons
    }
    finally {
        connection.release()
    }

}

async function getClubManagers() {
    const connection = await sqlconnector.getConnection()
    const query = 
    `select p.id,p.firstname,p.lastname from person p join member m on m.person_id = p.id join club c on p.club = c.id 
    where 
    role > 2000 and 
    curtime() >= getDbTime(m.valid_from,c.time_zone) and
    curtime() < getDbTime(m.valid_until,c.time_zone) and club = ? order by role,lastname
    `
    try {

        const managers = await sqlconnector.runQuery(connection, query,club_id)
        return managers;
    }
    finally {
        connection.release()
    }
}


/**
 * 
 * @returns {Promise<Array>} List of club guests
 */
async function getGuests() {

    const connection = await sqlconnector.getConnection()
    const query = `SELECT id,CONCAT(firstname,' ',lastname) as name,firstname,lastname,type_id,role,email,UNIX_TIMESTAMP(convert_tz(valid_until,time_zone,@@GLOBAL.time_zone )) as active_until FROM members_view`
    try {

        const courts = await sqlconnector.runQuery(connection, query)
        return courts
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

    const _firstNames = firstname.split(" ");
    const _lastNames = lastname.split("-");
    
    const formattedFirstName = _firstNames.reduce((acc,val,index) => {
            return acc + (index === 0 ? "" : " ") + val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
        },"")

    const formattedLastName = _lastNames.reduce((acc,val,index) => {
        return acc + (index === 0 ? "" : "-") + val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
    },"")

    const query = "INSERT INTO `person` (`type`,`club`,`created`,`firstname`,`lastname`,`email`,`phone`,`gender`) VALUES (?,?,now(),?,?,?,?,DEFAULT)";

    const connection = await sqlconnector.getConnection();

    try {

        await sqlconnector.runQuery(connection, query, [guest_type, club_id, formattedFirstName, formattedLastName, email, phone])

    }
    catch (error) {
        //console.log(error)
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
    finally {
        connection.release()
    }
}

/**
 * Return list of guests inelgible to play
 */
async function getInactiveGuests() {

    const connection = await sqlconnector.getConnection()
    const query = `SELECT * from inactive_guests`
    try {

        const guests = await sqlconnector.runQuery(connection, query)
        return guests
    }
    finally {
        connection.release()
    }
}

/**
 * Return list of guests elgible to play
 */
async function getActiveGuests() {

    const connection = await sqlconnector.getConnection()
    const query = `SELECT * FROM active_guests`
    try {

        const guests = await sqlconnector.runQuery(connection, query)
        return guests
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
    getPersons,
    getInactiveGuests,
    getActiveGuests,
    getActiveMembers,
    getClubManagers
}
