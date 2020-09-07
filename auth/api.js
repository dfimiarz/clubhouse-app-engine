const express = require('express')
const bodyParser = require('body-parser')
const { body, validationResult } = require('express-validator')
const courtcontroller = require('./controller')

const router = express.Router();

urlEncodedParse = bodyParser.urlencoded({ extended: false })
router.use(bodyParser.json())

/**
 * Route to get all courts
 */
router.get('/login',(req,res,next) => {

    res.json( { role: 'admin'} )

})

module.exports = router

