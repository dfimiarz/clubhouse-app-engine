const express = require('express')
const bodyParser = require('body-parser')
const { body, validationResult } = require('express-validator')
const matchcontroller = require('./controller')
const MatchEventEmitter = require('./../events/MatchEmitter')


const router = express.Router();

urlEncodedParse = bodyParser.urlencoded({ extended: false })
router.use(bodyParser.json())

/**
 * Route to get all matches for day
 */
router.get('/',(req,res,next) => {

//     const matches =[
//             { 
//                  id: 1,
//                  bumpable: false,
//                  court: 4,
//                  start: "2019-07-13 12:30:00",
//                  end: "2019-07-13 13:30:00",
//                  players: [
//                               {id: 1, firstname:"Laurent",lastname:"Mars", repeater: 0, repeater_lbl: "Non-repeater"},
//                               {id: 2, firstname:"Todd",lastname:"Snyder", repeater: 0, repeater_lbl: "Non-repeater"}
//                          ]
//             },
//             { 
//                 id: 2,
//                 bumpable: false,
//                 court: 4,
//                 start: "2019-07-13 13:30:00",
//                 end: "2019-07-13 14:30:00",
//                 players: [
//                              {id: 1, firstname:"Laurent",lastname:"Mars", repeater: 0, repeater_lbl: "Non-repeater"},
//                              {id: 2, firstname:"Todd",lastname:"Snyder", repeater: 0, repeater_lbl: "Non-repeater"}
//                         ]
//            },
            
//     ]

     const date = req.query.date ? req.query.date : null

     matchcontroller.getMatchesForDate(date)
     .then((matches)=>{
          res.send(matches)
     })
     .catch((err) => {
          next(err)
     })

})

router.post('/',(req,res,next) =>{

    matchcontroller.addMatch(req)
     .then((courts)=>{
          console.log("Count",MatchEventEmitter.listenerCount('matchadded'));
          const val = MatchEventEmitter.emit('matchadded','test')
          console.log( `emitted ${val}`)
          res.status(201).send()
     })
     .catch((err) => {
          next(err)
     })

    

})

const generateSendSseCallback = function(res){
     return function(message){
          console.log(message)
          res.write(`data: ${message}\n\n`)
     }
}

router.get('/watch',(req,res) => {

     res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
     })
     try{
          const sendFunc = generateSendSseCallback(res)
          MatchEventEmitter.on('matchadded', sendFunc )
          req.on('close', () => {
               console.log("closed")
               MatchEventEmitter.removeListener('matchadded',generateSendSseCallback)
          })
     }
     catch( err ){
          res.status(500)
     }
})

module.exports = router

