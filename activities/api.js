const express = require('express');
const { query, validationResult } = require('express-validator');
const activities_ctrl = require('./controller');
const { authGuard } = require('../middleware/clientauth');
const RESTError = require('./../utils/RESTError');
const { cloudLog, cloudLogLevels: loglevels } = require('./../utils/logger/logger');
const { validateDateRange } = require('./../utils/DateRangeValidator');
const { getClubInfo } = require('../club/controller');

const router = express.Router();

router.use(express.json());

router.get('/', authGuard,[
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
            return next(new RESTError(400, errors.array({ onlyFirstError: true })));
        }

        //Get the club time zone
        const { time_zone } = await getClubInfo();

        //get query parameters
        const { from, to } = validateDateRange(req.query.from, req.query.to, time_zone);

        const result = await activities_ctrl.getActivitiesForDates(from, to);

        res.json(result);

    } catch (err) {
        cloudLog(loglevels.error, err);
        next(new RESTError(err.message, 400));
    }
});

module.exports = router;