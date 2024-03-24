const sqlconnector = require("../db/SqlConnector");
const club_id = process.env.CLUB_ID;
const SQLErrorFactory = require("./../utils/SqlErrorFactory");
const {
  cloudLog,
  cloudLogLevels: loglevels,
} = require("./../utils/logger/logger");

const constatnts = require("./../utils/dbconstants");

/**
 *
 * @returns {Promise<Array>} List of club members
 */
async function getMembers() {
  const connection = await sqlconnector.getConnection();
  const query = `SELECT id,CONCAT(firstname,' ',lastname) as name,firstname,lastname,type_id,role,email,UNIX_TIMESTAMP(convert_tz(valid_until,time_zone,@@GLOBAL.time_zone )) as active_until FROM members_view`;
  try {
    const members = await sqlconnector.runQuery(connection, query);
    return members;
  } finally {
    connection.release();
  }
}

/**
 * Returns a list of club members and guests that are eligible to play
 */
async function getEligiblePersons() {
  const connection = await sqlconnector.getConnection();
  const query = `SELECT * FROM active_members
                   UNION
                   SELECT * FROM active_guests`;
  try {
    const persons = await sqlconnector.runQuery(connection, query);
    return persons;
  } finally {
    connection.release();
  }
}

/**
 * Returns a list of persons active membership. This includes guests with active status.
 */
async function getActivePersons() {
  const connection = await sqlconnector.getConnection();
  const query = `SELECT m.* FROM membership_view m JOIN club c on c.id = m.club WHERE DATE(convert_tz(NOW(),@@GLOBAL.time_zone,c.time_zone)) BETWEEN m.valid_from AND m.valid_until and m.club = ?`;
  const passes_query = `SELECT gp.id,guest_id,gp.type,gpt.label FROM clubhouse.guest_pass gp 
    join person p on p.id = gp.guest_id 
    join club c on p.club = c.id 
    join guest_pass_type gpt on gpt.id = gp.type
    WHERE 
    c.id = ? AND
    gp.valid = 1 AND
    convert_tz(NOW(),@@GLOBAL.time_zone,c.time_zone) BETWEEN gp.valid_from and gp.valid_to`;

  try {
    const active_passes = await sqlconnector.runQuery(
      connection,
      passes_query,
      club_id
    );

    //Create a hash map with key being guest_id and values being pass_id, type, and label
    const active_passes_hash = active_passes.reduce((acc, val) => {
      acc[val.guest_id] = { id: val.id, type: val.type, label: val.label };
      return acc;
    }, {});

    const persons = await sqlconnector.runQuery(connection, query, club_id);

    //Loop through persons and add active pass info to each guest
    persons.forEach((person) => {
      if (
        person.role_type_id === constatnts.ROLE_TYPES.GUEST_TYPE &&
        active_passes_hash[person.id]
      ) {
        person.pass = active_passes_hash[person.id];
      }
    });

    return persons;
  } finally {
    connection.release();
  }
}

async function getClubManagers() {
  const connection = await sqlconnector.getConnection();
  const query = `select p.id,p.firstname,p.lastname from person p join member m on m.person_id = p.id join club c on p.club = c.id 
    where 
    role > 2000 and 
    curtime() >= getDbTime(m.valid_from,c.time_zone) and
    curtime() < getDbTime(m.valid_until,c.time_zone) and club = ? order by role,lastname
    `;
  try {
    const managers = await sqlconnector.runQuery(connection, query, club_id);
    return managers;
  } finally {
    connection.release();
  }
}

async function getEventHosts() {
  const connection = await sqlconnector.getConnection();
  const query = `SELECT m.id, m.firstname, m.lastname 
                FROM membership_view m JOIN club c ON c.id = m.club 
                WHERE event_host = 1 
                AND curtime() >= getDbTime(m.valid_from,c.time_zone) 
                AND curtime() < getDbTime(m.valid_until,c.time_zone) 
                AND club = ?`;
  try {
    const hosts = await sqlconnector.runQuery(connection, query, club_id);
    return hosts;
  } finally {
    connection.release();
  }
}

/**
 *
 * @returns {Promise<Array>} List of club guests
 */
async function getGuests() {
  const connection = await sqlconnector.getConnection();
  const query = `SELECT id,CONCAT(firstname,' ',lastname) as name,firstname,lastname,type_id,role,email,UNIX_TIMESTAMP(convert_tz(valid_until,time_zone,@@GLOBAL.time_zone )) as active_until FROM members_view`;
  try {
    const courts = await sqlconnector.runQuery(connection, query);
    return courts;
  } finally {
    connection.release();
  }
}

async function addGuest(request) {
  const OPCODE = "ADD_GUEST";

  const firstname = request.body.firstname;
  const lastname = request.body.lastname;
  const email = request.body.email;
  const phone = request.body.phone;
  const GUEST_ROLE_ID = 500;

  const _firstNames = firstname.split(" ");
  const _lastNames = lastname.split("-");

  const formattedFirstName = _firstNames.reduce((acc, val, index) => {
    return (
      acc +
      (index === 0 ? "" : " ") +
      val.charAt(0).toUpperCase() +
      val.slice(1).toLowerCase()
    );
  }, "");

  const formattedLastName = _lastNames.reduce((acc, val, index) => {
    return (
      acc +
      (index === 0 ? "" : "-") +
      val.charAt(0).toUpperCase() +
      val.slice(1).toLowerCase()
    );
  }, "");

  const person_query =
    "INSERT INTO `person` (`club`,`created`,`firstname`,`lastname`,`email`,`phone`,`gender`) VALUES (?,now(),?,?,?,?,DEFAULT)";
  const membership_query =
    "INSERT INTO `membership` (`person_id`,`valid_from`,`valid_until`,`role`) VALUES (?,CURDATE(),DATE_ADD(DATE_FORMAT(NOW(), '%Y-01-01'), INTERVAL 1 YEAR),?)";

  const connection = await sqlconnector.getConnection();

  try {
    try {
      await sqlconnector.runQuery(
        connection,
        "START TRANSACTION READ WRITE",
        []
      );

      const person_insert_result = await sqlconnector.runQuery(
        connection,
        person_query,
        [club_id, formattedFirstName, formattedLastName, email, phone]
      );

      const person_id = person_insert_result.insertId;

      await sqlconnector.runQuery(connection, membership_query, [
        person_id,
        GUEST_ROLE_ID,
      ]);

      await sqlconnector.runQuery(connection, "COMMIT", []);

      cloudLog(
        loglevels.info,
        `Guest added: ${JSON.stringify({
          firstname: formattedFirstName,
          lastname: formattedLastName,
          email: email,
          phone: phone,
        })}`
      );
    } catch (error) {
      await sqlconnector.runQuery(connection, "ROLLBACK", []);
      throw error;
    }
  } catch (error) {
    throw new SQLErrorFactory.getError(OPCODE, error);
  } finally {
    connection.release();
  }
}

async function getPersons() {
  const connection = await sqlconnector.getConnection();
  const query = `SELECT * from person`;
  try {
    const persons = await sqlconnector.runQuery(connection, query);
    return persons;
  } finally {
    connection.release();
  }
}

/**
 * Return list of guests inelgible to play
 */
async function getInactiveGuests() {
  const connection = await sqlconnector.getConnection();
  const query = `SELECT * from inactive_guests`;
  try {
    const guests = await sqlconnector.runQuery(connection, query);
    return guests;
  } finally {
    connection.release();
  }
}

/**
 * Return list of guests elgible to play
 */
async function getActiveGuests() {
  const connection = await sqlconnector.getConnection();
  const query = `SELECT * FROM active_guests`;
  try {
    const guests = await sqlconnector.runQuery(connection, query);
    return guests;
  } finally {
    connection.release();
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
  getActivePersons,
  getClubManagers,
  getEventHosts
};
