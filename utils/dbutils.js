const transactionType = {
    NO_TRANSACTION: 0,
    READ_TRANSACTION: 1,
    WRITE_TRANSACTION: 2
}

/**
 * 
 * @param {String} query SQL query to format
 * @param {Number} t_type Transaction type as defined in transactionType
 * @returns {String} SQL query with transaction specific formatting
 */
function formatQuery(query, t_type) {
    switch (t_type) {
        case transactionType.READ_TRANSACTION:
            //Add LOCK IN SHARE MODE to query text if read transaction
            return query + " LOCK IN SHARE MODE";
        case transactionType.WRITE_TRANSACTION:
            //Add FOR UPDATE to query text if write transaction
            return query + " FOR UPDATE";
        default:
            //Return query as is if no transaction
            return query;
    }
}

module.exports = {
    formatQuery,
    transactionType
}