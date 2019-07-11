const express = require('express')
const bodyParser = require('body-parser')
const { body, validationResult } = require('express-validator')


const router = express.Router();

urlEncodedParse = bodyParser.urlencoded({ extended: false })
router.use(bodyParser.json())

/**
 * Route to get all courts
 */
router.get('/',(req,res,next) => {

    const courts =[
            { 
                 id: 1,
                 lbl: "#1",
                 statelbl: "opens",
                 state : 1,
                 msg : "",
                 opens : 480,
                 closes : 720
            },
            { 
                 id: 2,
                 lbl: "#2",
                 statelbl: "opens",
                 state : 1,
                 msg : "",
                 opens : 480,
                 closes : 720
            },
            { 
                 id: 3,
                 lbl: "#3",
                 statelbl: "opens",
                 state : 1,
                 msg : "",
                 opens : 480,
                 closes : 720
            },
            { 
                 id: 4,
                 lbl: "#4",
                 statelbl: "opens",
                 state : 1,
                 msg : "",
                 opens : 480,
                 closes : 720
            },
            { 
                 id: 5,
                 lbl: "#5",
                 statelbl: "opens",
                 state : 1,
                 msg : "",
                 opens : 480,
                 closes : 720
            }
    ]

    res.json(courts)

})

module.exports = router

