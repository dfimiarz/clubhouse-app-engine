const express = require('express')
const bodyParser = require('body-parser')
const controller = require('./controller')
const {authGuard} = require('../middleware/clientauth')
const { query } = require('express-validator')

const router = express.Router();

urlEncodedParse = bodyParser.urlencoded({ extended: false })
router.use(bodyParser.json())

/**
 * Route to get club info
 */
router.get('/',(req,res,next) => {

     controller.getClubInfo()
     .then((club)=>{
          res.json(club)
     })
     .catch((err) => {
          next(err)
     })

})

module.exports = router