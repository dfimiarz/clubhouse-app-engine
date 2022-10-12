const express = require('express');
const controller = require('./controller');

const router = express.Router();

router.use(express.json())

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