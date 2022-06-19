const express = require('express')
const bodyParser = require('body-parser')
const controller = require('./controller')
const {authGuard} = require('../middleware/clientauth')
const { query } = require('express-validator')

const router = express.Router();

urlEncodedParse = bodyParser.urlencoded({ extended: false })
router.use(bodyParser.json())

/**
 * Route to get all court schedules
 */
router.get('/',authGuard,(req,res,next) => {

     controller.getClubSchedules()
     .then((schedules)=>{
          res.json(schedules)
     })
     .catch((err) => {
          next(err)
     })

})

/**
 * Route to get all court schedules
 */
 router.get('/current',authGuard,(req,res,next) => {

    res.json("current_schedule");

})

module.exports = router