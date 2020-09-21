const express = require('express')
const bodyParser = require('body-parser')
const { checkSchema, validationResult } = require('express-validator')
const matchcontroller = require('./controller')
const { PatchCommandProcessor } = require('./controller')
const { checkMatchPermissions, validatePatchRequest } = require('./middleware')
const MatchEventEmitter = require('./../events/MatchEmitter')



const router = express.Router();

urlEncodedParse = bodyParser.urlencoded({ extended: false })
router.use(bodyParser.json())

/**
 * Route to get all matches for day
 */
router.get('/',(req,res,next) => {


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

router.get('/:id',(req,res,next) => {
     
          const id = req.params.id ? req.params.id : null

          matchcontroller.getMatchDetails(id)
          .then((results)=>{ 

               if( results.length !== 1 )
                    res.json(null)
               
               res.locals.match = JSON.parse(results[0].match)
               next()
               
          })
          .catch((err) => {
               next(err)
          })
     },
     checkMatchPermissions,
     (req,res,next) => {

     res.json(res.locals.match)
     }
)

router.patch('/:id', validatePatchRequest,
     (req,res,next) => {

     matchcontroller.processPatchCommand( req.params.id,res.locals.cmd)
     .then((results) => {
          res.status(204).send()
     }).catch((err) => {
         
          next(err)
     })

})


const generateSendSseCallback = function(res){
     return function(message){
          console.log(message)
          res.write(`data: ${message}\n\n`)
     }
}


router.get('/test',(req,res) => {
     res.writeHead(200,{
         'Content-Type': 'text/event-stream',
         'Cache-Control': 'no-cache',
         'Connection': 'keep-alive',
         'X-Accel-Buffering': 'no'
    })
    
    res.write("Test")
 })

router.get('/watch',(req,res) => {

     res.writeHead(200,{
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no'
     })
     
     res.write("Test")

     try{
          // const sendFunc = generateSendSseCallback(res)
          // MatchEventEmitter.on('matchadded', sendFunc )
          req.on('close', () => {
               console.log("closed")
               // MatchEventEmitter.removeListener('matchadded',sendFunc)
          })
     }
     catch( err ){
          res.status(500)
     }
})

module.exports = router

