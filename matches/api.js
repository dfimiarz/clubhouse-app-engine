const express = require('express')
const bodyParser = require('body-parser')
const { body, validationResult } = require('express-validator')


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
                 start: 915,
                 end: 945,
                 duration: 15,
                 players: [
                              {id: 1, firstname:"Laurent",lastname:"Mars", repeater: 0, repeaterlbl: "Non-repeater"},
                              {id: 2, firstname:"Todd",lastname:"Snyder", repeater: 0, repeaterlbl: "Non-repeater"}
                         ]
            },
            
    ]

    res.json(matches)

})

module.exports = router

