const express = require('express')
const bodyParser = require('body-parser')
const { checkSchema, check, validationResult, oneOf, body } = require('express-validator')
const matchcontroller = require('./controller')
//const { PatchCommandProcessor } = require('./controller')
const { checkBookingPermissions, validatePatchRequest } = require('./middleware')
//const MatchEventEmitter = require('./../events/MatchEmitter')
const { authGuard } = require('../middleware/clientauth')
const RESTError = require('./../utils/RESTError')
const pusher = require('./../pusher/Pusher')
const { cloudLog, cloudLogLevels : loglevels } = require('./../utils/logger/logger');


const router = express.Router();

urlEncodedParse = bodyParser.urlencoded({ extended: false })
router.use(express.json())

/**
 * Route to get all matches for day
 */
router.get('/', authGuard, (req, res, next) => {


     const date = req.query.date ? req.query.date : null

     matchcontroller.getBookingsForDate(date)
          .then((bookings) => {
               res.json(bookings)
          })
          .catch((err) => {
               next(err)
          })

})

router.post('/',[
          body('court').isInt().withMessage("Invalid court id"),
          body('bumpable').toInt().custom((val) => {
               return [0,1].indexOf(val) === -1 ? false: true;
          }).withMessage("Value not allowed"),
          body('type').isInt().withMessage("Invalid booking type"),
          body('date').isDate().withMessage("Invalid date"),
          body('players').isArray({ min: 1, max: 4}).withMessage("Incorrect number of players"),
          body('players.*.id').exists().withMessage("Player ID must be set").isInt().withMessage("Incorrect player ID"),
          body('players.*.type').exists().withMessage("Player TYPE must be set").isInt().withMessage("Incorrect player TYPE"),
          body('start').matches(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/,'i').withMessage("Invalid format"),
          body('end').matches(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/,'i').withMessage("Invalid format"),
          body('note').trim()
          
], authGuard, (req, res, next) => {

     const errors = validationResult(req);

     if (!errors.isEmpty()) {
          cloudLog(loglevels.error,"Add booking validation error: " + JSON.stringify(errors.array()));
          return next(new RESTError(422, { fielderrors: errors.array({onlyFirstError: true})}))
     }

     matchcontroller.addBooking(req)
          .then((courts) => {

               pusher.trigger("bookings","booking_change",{
                    date: req.body.date
               }).catch(err => {
                    cloudLog(loglevels.error,`Pusher error in post: ${err}`);
               })
               res.status(201).send()
               
          })
          .catch((err) => {
               next(err)
          })



})

router.get('/:id', authGuard, (req, res, next) => {

     const id = req.params.id ? req.params.id : null

     matchcontroller.getBookingDetails(id)
          .then((booking) => {
               res.locals.booking = booking;
               next()
          })
          .catch((err) => {
               next(err)
          })
     },
     checkBookingPermissions,
     (req, res, next) => {

          //Fiter out values that are needed by the front end
          const filtered_booking = (({ start,end, permissions, booking_type_desc, date, court_name, bumpable, notes, id, etag, players, utc_start,utc_end,utc_req_time}) => {
               return {
               'start': start,
               'end': end,
               'utc_start' : utc_start,
               'utc_end': utc_end,
               'utc_req_time': utc_req_time,
               'permissions': Array.from(permissions),
               'booking_type_desc' : booking_type_desc,
               'date' : date,
               'court_name' : court_name,
               'bumpable' : bumpable,
               'notes' : notes,
               'id' : id,
               'etag' : etag,
               'players' : players.map((player) => {
                    return {
                         'person_id': player.person_id,
                         'firstname': player.firstname,
                         'lastname': player.lastname,
                         'player_type_desc' : player.player_type_desc
                    }
               })
               }
          }
          )(res.locals.booking)

          res.json(filtered_booking);
     }
)

router.patch('/:id', authGuard, validatePatchRequest,
     (req, res, next) => {

          matchcontroller.processPatchCommand(req.params.id, res.locals.cmd)
               .then((result) => {

                    pusher.trigger("bookings","booking_change",{
                         date: result
                    }).catch(err => {
                         cloudLog(loglevels.error,`Pusher error in patch: ${err}`);
                    })

                    res.status(204).send()
               }).catch((err) => {

                    next(err)
               })

     })


// const generateSendSseCallback = function (res) {
//      return function (message) {
//           console.log(message)
//           res.write(`data: ${message}\n\n`)
//      }
// }


// router.get('/test', authGuard, (req, res) => {
//      res.writeHead(200, {
//           'Content-Type': 'text/event-stream',
//           'Cache-Control': 'no-cache',
//           'Connection': 'keep-alive',
//           'X-Accel-Buffering': 'no'
//      })

//      res.write("Test")
// })

// router.get('/watch', authGuard, (req, res) => {

//      res.writeHead(200, {
//           'Content-Type': 'text/event-stream',
//           'Cache-Control': 'no-cache',
//           'Connection': 'keep-alive',
//           'X-Accel-Buffering': 'no'
//      })

//      res.write("Test")

//      try {
//           // const sendFunc = generateSendSseCallback(res)
//           // MatchEventEmitter.on('matchadded', sendFunc )
//           req.on('close', () => {
//                console.log("closed")
//                // MatchEventEmitter.removeListener('matchadded',sendFunc)
//           })
//      }
//      catch (err) {
//           res.status(500)
//      }
// })

module.exports = router

