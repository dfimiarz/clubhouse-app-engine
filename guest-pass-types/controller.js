const sqlconnector = require("../db/SqlConnector");
const club_id = process.env.CLUB_ID;
const RESTError = require("../utils/RESTError");

//const CONSTANTS = require("./../utils/dbconstants");

/**
 * @typedef {import("./types").PassType} PassType;
 */

/**
 *
 * @returns {Promise<Array<PassType>>}
 */
const getPassTypes = async () => {
  const guest_pass_types_q = `
        SELECT 
            id,
            club_id,
            label,
            valid_days,
            season_limit
        FROM 
            guest_pass_type
        WHERE 
            club_id = ?`;

  const connection = await sqlconnector.getConnection();

  try {
    const guest_pass_types_res = await sqlconnector.runQuery(
      connection,
      guest_pass_types_q,
      club_id
    );

    if (!Array.isArray(guest_pass_types_res)) {
      throw new RESTError(400, "Error fetching guest pass types");
    }

    return guest_pass_types_res.map((pass_type) => {
      return {
        id: pass_type.id,
        label: pass_type.label,
      };
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getPassTypes,
};
