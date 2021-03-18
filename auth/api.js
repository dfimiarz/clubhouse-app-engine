const express = require('express')
const bodyParser = require('body-parser')
const { body } = require('express-validator')
const utils = require('../utils/utils')
const RESTError = require('../utils/RESTError')

const router = express.Router();

urlEncodedParse = bodyParser.urlencoded({ extended: false })
router.use(bodyParser.json())


/**
 * Route to check for geoauth
 */
router.get('/geo', (req, res, next) => {

    res.json({ geoauth: res.locals.geoauth })

})

router.get('/recaptchascore', async (req, res, next) => {

    let token = req.query.token;

    if (!token)
        return next(new RESTError(400, "Missing Captcha Token"))

    try {
        const response = await utils.verifyCaptcha(token);

        res.json(response);

    }
    catch (error) {
        next(new Error(error));
    }



})

module.exports = router

