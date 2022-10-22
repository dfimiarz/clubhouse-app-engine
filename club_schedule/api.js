const express = require('express')
const bodyParser = require('body-parser')
const controller = require('./controller')
const { authGuard } = require('../middleware/clientauth')

const router = express.Router();

router.use(bodyParser.json())

/**
 * Route to get all court schedules
 */
router.get('/', authGuard, (req, res, next) => {

     controller.getClubSchedules()
          .then((schedules) => {
               res.json(schedules)
          })
          .catch((err) => {
               next(err)
          })

})

/**
 * Route to get all court schedules
 */
router.get('/current', authGuard, (req, res, _next) => {

     res.json("current_schedule");

})

module.exports = router