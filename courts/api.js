const express = require('express')
const bodyParser = require('body-parser')
const { body, validationResult } = require('express-validator')
const courtcontroller = require('./controller')
const {authGuard} = require('../middleware/clientauth')

const router = express.Router();

urlEncodedParse = bodyParser.urlencoded({ extended: false })
router.use(bodyParser.json())

/**
 * Route to get all courts
 */
router.get('/',authGuard,(req,res,next) => {

     courtcontroller.getCourts()
     .then((courts)=>{
          res.json(courts)
     })
     .catch((err) => {
          next(err)
     })

})

module.exports = router

