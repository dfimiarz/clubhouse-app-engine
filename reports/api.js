const express = require('express')
const { check, validationResult, query, param } = require('express-validator');
const { getProcessor } = require('../bookings/command');
const RESTError = require('./../utils/RESTError');
const { roleGuard } = require('../middleware/clientauth');
const roles = require('../utils/SystemRoles')
const { getReportTypes } = require('./reportTypes');
const { runProcessor } = require('./controller');
const { getClubInfo } = require('../club/controller');

//Add timezone library
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const router = express.Router();

router.use(express.json());


/**
 *  Route to get all reports
 */
router.get('/', roleGuard([roles.ADMIN, roles.MANAGER]), (req, res, next) => {

    res.json(
        getReportTypes()
    );
});

/**
 * Route to get a report based on the report name
 */
router.get('/:type', roleGuard([roles.ADMIN, roles.MANAGER]), [
    param('type').isString().withMessage("Invalid report name").isIn(getReportTypes()).withMessage("Invalid report type"),
    query('from').optional().isISO8601().withMessage("Invalid FROM date"),
    query('to').optional().isISO8601().withMessage("Invalid TO date"),
    //if from or to is set, both must be set
    query('from').custom((value, { req }) => {
        if (value && !req.query.to) {
            throw new Error('TO date is required');
        }
        return true;
    }),
    query('to').custom((value, { req }) => {
        if (value && !req.query.from) {
            throw new Error('FROM date is required');
        }

        return true;
    }),

], async (req, res, next) => {
    
    try {
        //Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new RESTError(400, errors.array({ onlyFirstError: true }));
        }

        //Get the club time zone
        const { time_zone } = await getClubInfo();

        //get query parameters
        const { from, to } = await validateTimeRange(req.query.from, req.query.to, time_zone);

        //Run processor
        const result = await runProcessor(req.params.type, from, to);

        //Construct response
        const reponse_payload = {
            report: req.params.type,
            from: from,
            to: to,
            result: result
        }

        //Send result
        res.json(reponse_payload);
    }
    catch (err) {
        next(err);
    }

})


/**
 * 
 * @param {string} from_date ISO8601 date string
 * @param {string} to_date ISO8601 date string
 * @returns {Object} Validated values for from and to dates
 */
async function validateTimeRange(from_date, to_date, time_zone) {

    if (from_date && to_date) {
        //from_date and to_date must be in thesame year
        const from_year = dayjs.tz(from_date,time_zone).year();
        const to_year = dayjs.tz(to_date,time_zone).year();
    
        if (from_year !== to_year) {
            throw new RESTError(400, "FROM and TO dates must be in the same year"); 
        }

        //Convert to date objects and get time in milliseconds
        const from_milsec = dayjs.tz(from_date,time_zone).valueOf();
        const to_milsec = dayjs.tz(to_date,time_zone).valueOf();

        //swap and return from_date and to_date if from_milsec is greater than to_milsec
        return (from_milsec > to_milsec) ? { from: to_date, to: from_date } : { from: from_date, to: to_date };
    } else {
        //If from_date or to_date is not set, set them to the current date in ISO8601 format
        const today = dayjs().tz(time_zone).format('YYYY-MM-DD');
        
        return { from: today, to: today };
    }

}

module.exports = router;
