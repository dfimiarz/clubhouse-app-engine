const express = require('express')
const bodyParser = require('body-parser')
const { check, validationResult } = require('express-validator')
const controller = require('./controller')
const RESTError = require('./../utils/RESTError');

const router = express.Router();

urlEncodedParse = bodyParser.urlencoded({ extended: false })
router.use(bodyParser.json())

/**
 * Route to get all courts
 */
router.post('/bulk', [
    check('memberhost').notEmpty().withMessage("Member host cannot be empty").isInt().withMessage("Member host id must be an integer"),
    check('guests').notEmpty().withMessage("Field cannot be empty").isArray().withMessage("Expected array of guests"),
    check('guests.*').isInt().withMessage("All guests values should be integers")
], (req, res, next) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return next(new RESTError(422, { fielderrors: errors }))
    }

    const memberhost = req.body.memberhost;
    const guests = req.body.guests;

    controller.addGuestActivationsInBulk(memberhost, guests)
        .then((result) => {
            res.json({ val: result });
        })
        .catch(err => {
            next(err instanceof RESTError ? err : new RESTError(409, "Operation failed"))
        })

})

module.exports = router

