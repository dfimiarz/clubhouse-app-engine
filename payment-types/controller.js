const sqlconnector = require("../db/SqlConnector");
const club_id = process.env.CLUB_ID;
const RESTError = require("../utils/RESTError");

/**
 * @typedef {import("./types").PaymentType} PaymentType;
 */

/**
 *
 * @returns {Promise<Array<PaymentType>>}
 */
const getPaymentTypes = async () => {
  const payment_types_q = `
  SELECT 
    pt.id,
    pt.club,
    pt.name,
    pt.fee,
    pt.fee_type,
    pp.name as processor,
    pp.validator,
    JSON_MERGE_PATCH(pp.default_config,pt.processor_config) as processor_config 
  FROM clubhouse.payment_types pt 
  JOIN payment_processors pp on pp.id = pt.processor 
  WHERE club = ?`;

  const connection = await sqlconnector.getConnection();

  try {
    const payment_types_res = await sqlconnector.runQuery(
      connection,
      payment_types_q,
      [club_id]
    );

    if (!Array.isArray(payment_types_res) || payment_types_res.length < 1) {
      throw new RESTError(400, "Failed loading guest pass types");
    }

    return payment_types_res.map((payment_type) => {
      return {
        id: payment_type.id,
        name: payment_type.name,
        fee: payment_type.fee,
        fee_type: payment_type.fee_type,
        processor: payment_type.processor,
        processor_config: JSON.parse(payment_type.processor_config),
        validator: payment_type.validator,
      };
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getPaymentTypes,
};
