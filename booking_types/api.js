const express = require('express')
const bodyParser = require('body-parser')
const { check, validationResult } = require('express-validator')
const controller = require('./controller')
const RESTError = require('./../utils/RESTError');

const router = express.Router();

urlEncodedParse = bodyParser.urlencoded({ extended: false })
router.use(bodyParser.json())

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