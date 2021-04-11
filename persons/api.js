const express = require('express')
const bodyParser = require('body-parser')
const { check, validationResult } = require('express-validator')
const controller = require('./controller')
const RESTError = require('./../utils/RESTError');
const { authGuard } = require('../middleware/clientauth')
const authcontroller = require('../auth/controller')
const utils = require('../utils/utils')

const router = express.Router();

urlEncodedParse = bodyParser.urlencoded({ extended: false })
router.use(bodyParser.json())

/**
 * Route to get all nestboxes
 */
router.get('/', authGuard, (req, res, next) => {

     controller.getPersons()
          .then((persons) => {
               res.json(persons)
          })
          .catch((err) => {
               next(err)
          })


})

router.get('/eligible', authGuard, (req, res, next) => {

     controller.getEligiblePersons()
          .then((persons) => {
               res.json(persons)
          })
          .catch((err) => {
               next(err)
          })


})

router.get('/members', authGuard, (req, res, next) => {

     controller.getMembers()
          .then((members) => {
               res.json(members)
          })
          .catch((err) => {
               next(err)
          })


})

router.get('/members/active', authGuard, (req, res, next) => {

     controller.getActiveMembers()
          .then((guests) => {
               res.json(guests)
          })
          .catch((err) => {
               next(err)
          })


})

router.get('/members/managers', authGuard, (req, res, next) => {
     controller.getClubManagers()
          .then((managers) => {
               res.json(managers)
          })
          .catch((err) => {
               next(err)
          })
})

router.get('/guests', authGuard, (req, res, next) => {

     controller.getGuests()
          .then((guests) => {
               res.json(guests)
          })
          .catch((err) => {
               next(err)
          })


})

router.get('/guests/inactive', authGuard, (req, res, next) => {

     controller.getInactiveGuests()
          .then((guests) => {
               res.json(guests)
          })
          .catch((err) => {
               next(err)
          })


})

router.get('/guests/active', authGuard, (req, res, next) => {

     controller.getActiveGuests()
          .then((guests) => {
               res.json(guests)
          })
          .catch((err) => {
               next(err)
          })


})

router.post('/guests', [
     check('email').notEmpty().withMessage("Field cannot be empty").isEmail().withMessage("Invalid E-mail Address"),
     check('firstname').notEmpty().withMessage("Field cannot be empty").isString(),
     check('lastname').notEmpty().withMessage("Field cannot be empty").isString(),
     check('phone').notEmpty().withMessage("Field cannot be empty").isString()
], async (req, res, next) => {

     //Check if captcha is set for users that are not logged in
     if (!utils.isAuthenticated(res)) {
          await check('captcha').notEmpty().withMessage("Captcha must be set").run(req);
          await check('requestid').notEmpty().withMessage("Missing request id").run(req);
     }

     const errors = validationResult(req);

     if (!errors.isEmpty()) {
          return next(new RESTError(422, { fielderrors: errors }))
     }

     try {
          //Run captcha verification is users is not authenticated
          if (! utils.isAuthenticated(res)) {
               const verified = await authcontroller.verifyCaptcha(req.body.requestid, req.body.captcha)

               if (!verified) {
                    throw new RESTError(422,{ fielderrors: [{ param: "captcha", msg: "Failed to verify captcha"}]});
               }
          }

          await controller.addGuest(req);

          res.status(201).send();
     }
     catch (err) {
          return next(err)
     }

})

module.exports = router

