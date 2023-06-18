const sqlconnector = require("../db/SqlConnector");
const club_id = process.env.CLUB_ID;
//const SQLErrorFactory = require("./../utils/SqlErrorFactory");
const RESTError = require("../utils/RESTError");

const CONSTANTS = require("./../utils/dbconstants");

const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * @typedef {import("./types").PassInfo} PassInfo;
 */

/**
 *
 * @param {PassInfo} passinfo
 * @returns
 */
const addGuestPass = async (passinfo) => {
  const insert_guest_pass_q = `INSERT INTO \`guest_pass\` 
  (\`id\`,
  \`created\`,
  \`updated\`,
  \`guest_id\`,
  \`member_id\`,
  \`valid\`,
  \`type\`,
  \`valid_from\`,
  \`valid_to\`) 
  VALUES 
  (null, default, default,?,?,default,?,?,?)`;

  const role_check_q = `SELECT mv.role_type_id,c.time_zone,can_host FROM membership_view mv JOIN club c on c.id = mv.club WHERE mv.id = ? and club = ? and DATE(CONVERT_TZ(NOW(), @@GLOBAL.time_zone, c.time_zone)) BETWEEN mv.valid_from AND mv.valid_until`;

  const guest_pass_typq_q = `SELECT label, valid_days, season_limit FROM guest_pass_type WHERE id = ? and club_id  = ?`;

  const connection = await sqlconnector.getConnection();

  try {
    const host_data_res = await sqlconnector.runQuery(
      connection,
      role_check_q,
      [passinfo.host, club_id]
    );

    if (!(Array.isArray(host_data_res) && host_data_res.length === 1)) {
      throw new RESTError(400, "Invalid host");
    }

    //Check if host is allowed to host guests
    const person_can_host = host_data_res[0].can_host;

    if (person_can_host !== 1) {
      throw new RESTError(400, "Invalid host");
    }

    const guest_data_res = await sqlconnector.runQuery(
      connection,
      role_check_q,
      [passinfo.guest, club_id]
    );

    if (!(Array.isArray(guest_data_res) && guest_data_res.length === 1)) {
      throw new RESTError(400, "Guest not found");
    }

    //Check if person designated as guest is actually a guest
    const guest_role_type = guest_data_res[0].role_type_id;

    if (guest_role_type !== CONSTANTS.ROLE_TYPES.GUEST_TYPE) {
      throw new RESTError(400, "Invalid guest");
    }

    //Get time_zone data from guest
    const time_zone = guest_data_res[0].time_zone;

    //seasonStart if the first day of current year
    const seasonStart = dayjs()
      .tz(time_zone)
      .startOf("year")
      .format("YYYY-MM-DD HH:mm:ss");
    //seasonEnd is the last day of current year
    const seasonEnd = dayjs()
      .tz(time_zone)
      .endOf("year")
      .format("YYYY-MM-DD HH:mm:ss");

    const pass_type_res = await sqlconnector.runQuery(
      connection,
      guest_pass_typq_q,
      [passinfo.pass_type, club_id]
    );

    if (!(Array.isArray(pass_type_res) && pass_type_res.length === 1)) {
      throw new RESTError(400, "Invalid pass type");
    }

    //Get valid_days, season_limit, and label from pass type
    const valid_days = pass_type_res[0].valid_days;
    const season_limit = pass_type_res[0].season_limit;
    /** @type {string} */
    const pass_type_label = pass_type_res[0].label;

    //Check current pass count for guest
    const passCountForGuest = await getGuestPassCount(
      connection,
      passinfo.guest,
      seasonStart,
      seasonEnd
    );

    if (passCountForGuest >= season_limit) {
      throw new RESTError(400, "Guest has reached the season limit");
    }

    //Make sure that valid days is greater than 0 and season limit is greater or equal 0
    if (valid_days <= 0 || season_limit < 0) {
      throw new RESTError(400, "Invalid pass configuration");
    }

    //Pass is valid from beinging of the day
    const valid_from = dayjs().tz("America/New_York").startOf("day");

    //Throw error if valid_from is before season start
    if (valid_from.isBefore(seasonStart)) {
      throw new RESTError(400, "Pass types is not valid yet");
    }

    //Pass is valid to valid_from + valid_days - 1
    let valid_to = valid_from.add(valid_days - 1, "day").endOf("day");

    //If valid_to is after season end, set it to season end
    if (valid_to.isAfter(seasonEnd)) {
      valid_to = dayjs(seasonEnd);
    }

    //Format both dates to YYYY-MM-DD HH:mm:ss
    const v_f_formatted = valid_from.format("YYYY-MM-DD HH:mm:ss");
    const v_t_formatted = valid_to.format("YYYY-MM-DD HH:mm:ss");

    const guest_pass_res = await sqlconnector.runQuery(
      connection,
      insert_guest_pass_q,
      [
        passinfo.guest,
        passinfo.host,
        passinfo.pass_type,
        v_f_formatted,
        v_t_formatted,
      ]
    );
    return {
      id: guest_pass_res.insertId,
      label: pass_type_label,
      type: passinfo.pass_type,
    };
  } catch (err) {
    throw new RESTError(500, "Unable to activate", err);
  }
};

async function getGuestPassCount(connection, guest_id, seasonStart, seasonEnd) {
  //Count all the passes that are valid in the season
  const pass_count_q = `SELECT COUNT(*) as count FROM guest_pass WHERE guest_id = ? and valid = 1 AND valid_from >= ? and valid_to <= ?`;

  const pass_count_res = await sqlconnector.runQuery(connection, pass_count_q, [
    guest_id,
    seasonStart,
    seasonEnd,
  ]);

  if (!(Array.isArray(pass_count_res) && pass_count_res.length === 1)) {
    throw new RESTError(400, "Unable to read pass data");
  }

  //Get the count of passes
  return pass_count_res[0].count;
}

module.exports = {
  addGuestPass,
};
