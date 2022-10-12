//Add timezone library
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

const RESTError = require('./../utils/RESTError');

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * @description Ensure from_date and to_date are in the same year
 * 
 * @param {string} from_date ISO8601 date string
 * @param {string} to_date ISO8601 date string
 * @param {string} time_zone Timezone string
 * 
 * @returns {string|null} Error message if the dates are not in the same year
 * 
 */
function validateDateRangeYear(from_date, to_date, time_zone) {

    if (from_date && to_date) {
        const from_year = dayjs.tz(from_date, time_zone).year();
        const to_year = dayjs.tz(to_date, time_zone).year();

        if (from_year !== to_year) {
            return "Invalid date range. FROM and TO dates must be in the same year";
        }
    } else {
        return "Invalid date range. FROM and TO dates must be set";
    }

    return null;

}

/**
 * 
 * @param {string} from_date ISO8601 date string
 * @param {string} to_date ISO8601 date string
 * @returns {Object} Validated values for from and to dates
 * 
 * @throws {RESTError} If the dates are invalid
 * 
 * @description Validates the from and to dates. 
 */
function validateDateRange(from_date, to_date, time_zone) {

    if (from_date && to_date) {
        const error = validateDateRangeYear(from_date, to_date, time_zone);

        if (error) {
            throw new RESTError(400, error);
        }

        //Convert to date objects and get time in milliseconds
        const from_milsec = dayjs.tz(from_date, time_zone).valueOf();
        const to_milsec = dayjs.tz(to_date, time_zone).valueOf();

        //swap and return from_date and to_date if from_milsec is greater than to_milsec
        return (from_milsec > to_milsec) ? { from: to_date, to: from_date } : { from: from_date, to: to_date };
    } else {
        //If from_date or to_date is not set, set them to the current date in ISO8601 format
        const today = dayjs().tz(time_zone).format('YYYY-MM-DD');

        return { from: today, to: today };
    }

}

module.exports = {
    validateDateRange
}