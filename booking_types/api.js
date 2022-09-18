const express = require('express')
const { check, validationResult } = require('express-validator')
const controller = require('./controller')
const RESTError = require('./../utils/RESTError');

const router = express.Router();

router.use(express.json());

/**
 * Route to get all nestboxes
 */
router.get('/',(req, res, next) => {

    controller.getBookingTypes()
        .then((booking_types) => {
            res.json(booking_types)
        })
        .catch((err) => {
            next(err)
        })

})

module.exports = router