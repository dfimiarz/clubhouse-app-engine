const express = require('express')
const bodyParser = require('body-parser')
const { body } = require('express-validator')

const router = express.Router();

urlEncodedParse = bodyParser.urlencoded({ extended: false })
router.use(bodyParser.json())


/**
 * Route to check for geoauth
 */
router.get('/geo',(req,res,next) => {

    res.json( { geoauth : res.locals.geoauth } )

})

module.exports = router

