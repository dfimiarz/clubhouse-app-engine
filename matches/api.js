const express = require('express')
const bodyParser = require('body-parser')
const { body, validationResult } = require('express-validator')
const matchcontroller = require('./controller')


const router = express.Router();

urlEncodedParse = bodyParser.urlencoded({ extended: false })
router.use(bodyParser.json())

/**
 * Route to get all matches for day
 */
router.get('/',(req,res,next) => {

    const matches =[
            { 
                 id: 1,
                 bumpable: false,
                 court: 4,
                 start: "2019-07-13 12:30:00",
                 end: "2019-07-13 13:30:00",
                 startmin: 915,
                 endmin: 945,
                 players: [
                              {id: 1, firstname:"Laurent",lastname:"Mars", repeater: 0, repeater_lbl: "Non-repeater"},
                              {id: 2, firstname:"Todd",lastname:"Snyder", repeater: 0, repeater_lbl: "Non-repeater"}
                         ]
            },
            { 
                id: 2,
                bumpable: false,
                court: 4,
                start: "2019-07-13 13:30:00",
                end: "2019-07-13 14:30:00",
                startmin: 600,
                endmin: 660,
                players: [
                             {id: 1, firstname:"Laurent",lastname:"Mars", repeater: 0, repeater_lbl: "Non-repeater"},
                             {id: 2, firstname:"Todd",lastname:"Snyder", repeater: 0, repeater_lbl: "Non-repeater"}
                        ]
           },
            
    ]

    res.json(matches)

})

router.post('/',(req,res,next) =>{

    const matches = req.body.players

    matchcontroller.addMatch(req)
     .then((courts)=>{
        res.status(201).send()
     })
     .catch((err) => {
          next(err)
     })

    

})

module.exports = router

