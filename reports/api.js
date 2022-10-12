const express = require('express')
const { validationResult, query, param } = require('express-validator');
const RESTError = require('./../utils/RESTError');
const { roleGuard } = require('../middleware/clientauth');
const roles = require('../utils/SystemRoles')
const { getReportTypes } = require('./reportTypes');
const { runProcessor } = require('./controller');
const { getClubInfo } = require('../club/controller');
const { validateDateRange } = require('../utils/DateRangeValidator');

const router = express.Router();

router.use(express.json());


/**
 *  Route to get all reports
 */
router.get('/', roleGuard([roles.ADMIN, roles.MANAGER]), (req, res, _next) => {

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
        const { from, to } = validateDateRange(req.query.from, req.query.to, time_zone);

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

module.exports = router;
