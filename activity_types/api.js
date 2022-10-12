const express = require('express');
const activity_types_ctrl = require('./controller');
const { authGuard } = require('../middleware/clientauth');
const RESTError = require('./../utils/RESTError');
const { cloudLog, cloudLogLevels: loglevels } = require('./../utils/logger/logger');

const router = express.Router();

router.use(express.json());

router.get('/', authGuard ,async (req, res, next) => {

    try {

        const result = await activity_types_ctrl.getActivityTypes();

        res.json(result);

    } catch (err) {
        cloudLog(loglevels.error, err);
        next(new RESTError(err.message, 400));
    }
});

module.exports = router;