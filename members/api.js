const express = require('express')
const bodyParser = require('body-parser')
const { body, validationResult } = require('express-validator')
const membercontroller = require('./controller')


const router = express.Router();

urlEncodedParse = bodyParser.urlencoded({ extended: false })
router.use(bodyParser.json())

/**
 * Route to get all nestboxes
 */
router.get('/',(req,res,next) => {

    membercontroller.getMembers()
     .then((members)=>{
          res.json(members)
     })
     .catch((err) => {
          next(err)
     })


})

module.exports = router

