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
                 date: "20190101",
                 startmin: 915,
                 endmin: 945,
                 duration: 15,
                 players: [
                              {id: 1, firstname:"Laurent",lastname:"Mars", repeater: 0, repeater_lbl: "Non-repeater"},
                              {id: 2, firstname:"Todd",lastname:"Snyder", repeater: 0, repeater_lbl: "Non-repeater"}
                         ]
            },
            { 
                id: 2,
                bumpable: false,
                court: 4,
                date: "20190101",
                startmin: 600,
                endmin: 660,
                duration: 15,
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

