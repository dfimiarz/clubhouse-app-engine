const express = require('express')
const { check, validationResult, body } = require('express-validator')
const controller = require('./controller')
const RESTError = require('./../utils/RESTError');
const { authGuard } = require('../middleware/clientauth')
const authcontroller = require('../auth/controller')
const utils = require('../utils/utils')

const router = express.Router();

router.use(express.json())

/**
 * Route to get all persons
 */
router.get('/', authGuard, (req, res, next) => {

     controller.getPersons()
          .then((persons) => {
               res.json(persons)
          })
          .catch((err) => {
               next(err)
          })


});

/**
 * Route to get all active persons
 */
router.get('/active', authGuard, (req, res, next) => {

     controller.getActivePersons()
     .then((persons) => {
          res.json(persons)
     })
     .catch((err) => {
          next(err)
     })
});

/**
 * TO DO: REMOVE THIS ROUTE
 */
// router.get('/eligible', authGuard, (req, res, next) => {

//      controller.getEligiblePersons()
//           .then((persons) => {
//                res.json(persons)
//           })
//           .catch((err) => {
//                next(err)
//           })


// })

router.get('/members', authGuard, (req, res, next) => {

     controller.getMembers()
          .then((members) => {
               res.json(members)
          })
          .catch((err) => {
               next(err)
          })
});

router.get('/members/active', authGuard, (req, res, next) => {

     controller.getActiveMembers()
          .then((guests) => {
               res.json(guests)
          })
          .catch((err) => {
               next(err)
          })


});

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
     body('email').isString().trim().notEmpty().withMessage("Field cannot be empty").isEmail().withMessage("Invalid E-mail Address"),
     body('firstname').isString().trim().notEmpty().withMessage("Field cannot be empty").isLength({ min: 2, max: 32}).withMessage("Must be between 2 and 32 characters long"),
     body('lastname').isString().trim().notEmpty().withMessage("Field cannot be empty").isLength({ min: 2, max: 32}).withMessage("Must be between 2 and 32 characters long"),
     body('phone').if((value) => !!value ).isMobilePhone('en-US').withMessage("Must be a valid phone number"),
     check('agreement').exists().isBoolean().isIn([true]).withMessage("Agreement required")
], async (req, res, next) => {

     //Check if captcha is set for users that are not logged in
     if (!utils.isAuthenticated(res)) {
          await body('hcaptcha').notEmpty().withMessage("hCaptcha must be set").run(req);
     }

     const errors = validationResult(req);

     if (!errors.isEmpty()) {
          return next(new RESTError(422, { fielderrors: errors.array({onlyFirstError: true})}))
     }

     try {
          //Run captcha verification is users is not authenticated
          if (! utils.isAuthenticated(res)) {
               const verified = await authcontroller.verifyhCaptcha(req.body.hcaptcha);

               if (!verified) {
                    throw new RESTError(422,{ fielderrors: [{ param: "hcaptcha", msg: "Failed to verify captcha"}]});
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

