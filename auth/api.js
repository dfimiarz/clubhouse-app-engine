const express = require('express')
const RESTError = require('../utils/RESTError')
const rateLimiter = require('../rate-limiter/rate-limiter')
const authcontroller = require('./controller')


const router = express.Router();



router.use(express.json())

/**
 * Route to check for geoauth
 */
router.get('/geo', (req, res, next) => {

    res.json({ geoauth: res.locals.geoauth })

})

router.get('/captcha', rateLimiter.captchalimiter, async (req, res, next) => {

    authcontroller.getCaptcha()
        .then((val) => {
            res.json(val);
        })
        .catch((err) => {
            return next(new RESTError(422, { fielderrors: [{ param: "requestid", msg: "Unable to generate captcha" }] }));
        })

})

module.exports = router

