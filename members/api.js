const express = require('express')
const bodyParser = require('body-parser')
const { body, validationResult } = require('express-validator')


const router = express.Router();

urlEncodedParse = bodyParser.urlencoded({ extended: false })
router.use(bodyParser.json())

/**
 * Route to get all nestboxes
 */
router.get('/',(req,res,next) => {

    const members =[
        {id: 1, firstname:"Laurent",lastname:"Mars",role:"member",email:"ok@gmail.com"},
        {id: 2,firstname:"Todd",lastname:"Snyder",role:"member",email:"ok@gmail.com"},
        {id: 3,firstname:"June",lastname:"Tsuchiya",role:"member",email:"ok@gmail.com"},
        {id: 4,firstname:"Myron",lastname:"Levine",role:"member",email:"ok@gmail.com"},
        {id: 5,firstname:"Ray",lastname:"Habib",role:"member",email:"ok@gmail.com"},
        {id: 6,firstname:"Laurent",lastname:"Mars",role:"member",email:"ok@gmail.com"},
        {id: 7,lastname:"Adasko", firstname:"Shelly",email:"sadasko127@gmail.com",role:"member"},
        {id: 8,lastname:"Akpan", firstname:"Joani",email:"j.akpan@verizon.net",role:"member"},
        {id: 9,lastname:"Akpan", firstname:"Obong",email:"ofakpan@aol.com",role:"member"},
        {id: 10,lastname:"Alvarez", firstname:"Maria",email:"maconsult@aol.com",role:"member"},
        {id: 11,lastname:"Anderson", firstname:"Gina",email:"gsa1700@gmail.com",role:"member"},
        {id: 12,lastname:"Anderson", firstname:"Tom",email:"tanderson1700@gmail.com",role:"member"},
        {id: 13,lastname:"Arcila", firstname:"Fabio",email:"farcila@tourolaw.edu",role:"member"},
        {id: 14,lastname:"Arida", firstname:"Paul",email:"paularidaesq@yahoo.com",role:"member"},
        {id: 15,lastname:"Baccash", firstname:"Gina",email:"ginabaccash@nyc.rr.com",role:"member"},
        {id: 16,lastname:"Backner", firstname:"Tom",email:"tombackner@yahoo.com",role:"member"},
        {id: 17,lastname:"Baron", firstname:"Marty",email:"mbaron@levinsohn.com",role:"member"}
    ]

    res.json(members)

})

module.exports = router

