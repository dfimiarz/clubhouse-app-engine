const express = require('express')
const bodyParser = require('body-parser')
const { check, validationResult } = require('express-validator')
const controller = require('./controller')
const RESTError = require('./../utils/RESTError');
const { authGuard } = require('../middleware/clientauth')
const { validateCommand, validateCommandParams } = require('../utils/PatchCommandValidator');
const { auth } = require('firebase-admin');

const router = express.Router();

urlEncodedParse = bodyParser.urlencoded({ extended: false })
router.use(bodyParser.json())

/**
 * Route to get all courts
 */
router.post('/bulk',authGuard, [
    check('memberhost').notEmpty().withMessage("Member host cannot be empty").isInt().withMessage("Member host id must be an integer"),
    check('guests').notEmpty().withMessage("Field cannot be empty").isArray().withMessage("Expected array of guests"),
    check('guests.*').isInt().withMessage("All guests values should be integers")
], (req, res, next) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return next(new RESTError(422, { fielderrors: errors.array( {  onlyFirstError: true }) }))
    }

    const memberhost = req.body.memberhost;
    const guests = req.body.guests;

    

    controller.addGuestActivationsInBulk(memberhost, guests)
        .then((result) => {
            res.json({ val: result });
        })
        .catch(err => {
            next(err instanceof RESTError ? err : new RESTError(409, "Operation failed"))
        })

})

router.get('/current',authGuard,(req,res, next) => {

    controller.getCurrentActivations()
        .then((result) => {
            res.json(result);
        })
        .catch(err => {
            next(err instanceof RESTError ? err : new RESTError(500, "Operation failed"))
        })


});

/**
 * Patch guest_activation
 */
router.patch('/:id', authGuard,(req,res,next) => {

    const OPCODE = "PATCH_GUEST_ACTIVATION"
    const command = req.body.cmd;
    const id = req.params.id;

    const deactivete_schema = {
        "id":"DEACTIVATE_SCHEMA",
        "type": "object",
        "properties":{
            "etag":{
                "type": "string",
                "pattern": /[a-fA-F0-9]{32}/
            }
        },
        "required": ["etag"]
    }

    if( ! (id && command )){
        return next(new RESTError(400,{ type: OPCODE, message: "Malformed request" }));
    }

    if( validateCommand(command,["DEACTIVATE"]).length != 0 ){
        return next(new RESTError(400,{ type: OPCODE, message: "Unsupported command" }));
    }

    if( validateCommandParams(command,deactivete_schema).length !=0 ){
        return next(new RESTError(400,{ type: OPCODE, message: "Unsupported command parameters" }));
    }

    controller.deactivateGuest(id,command.params.etag)
    .then((result) => {
        res.status(204).send();
    })
    .catch( err => {

        next( err instanceof RESTError ? err : new RESTError(500,{ type: OPCODE, message: err.message }))
    })

})

module.exports = router

