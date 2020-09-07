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
router.get('/', (req, res, next) => {

     controller.getPersons()
          .then((persons) => {
               res.json(persons)
          })
          .catch((err) => {
               next(err)
          })


})

router.get('/eligible', (req, res, next) => {

     controller.getEligiblePersons()
          .then((persons) => {
               res.json(persons)
          })
          .catch((err) => {
               next(err)
          })


})

router.get('/members', (req, res, next) => {

     controller.getMembers()
          .then((members) => {
               res.json(members)
          })
          .catch((err) => {
               next(err)
          })


})

router.get('/guests', (req, res, next) => {

     controller.getGuests()
          .then((guests) => {
               res.json(guests)
          })
          .catch((err) => {
               next(err)
          })


})

router.post('/guests', [
     check('email').notEmpty().withMessage("Field cannot be empty").isEmail().withMessage("Invalid E-mail Address"),
     check('firstname').notEmpty().withMessage("Field cannot be empty"),
     check('lastname').notEmpty().withMessage("Field cannot be empty"),
     check('phone').notEmpty().withMessage("Field cannot be empty")
], (req, res, next) => {

     const errors = validationResult(req);

     if (!errors.isEmpty()) {
          return next(new RESTError(422, { fielderrors: errors }))
     }

     controller.addGuest(req)
          .then((guests) => {
               res.json(guests)
          })
          .catch((err) => {
               next(err)
          })
})

module.exports = router

