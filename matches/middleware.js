const { hasRemovePermission, hasEndPermission, hasChangeEndPermission, hasChangeStartPermission, hasChangeCourtPermission } = require('./permissions/MatchPermissions')
const Validator = require('jsonschema').Validator
const { getSchema, getSupportedCommands } = require('./command')

function checkMatchPermissions(req,res,next) {

    var match = res.locals.match

    match.permissions = []
    
    if( hasRemovePermission(match))
        match.permissions.push('CAN_REMOVE')

    if( hasEndPermission(match) )
        match.permissions.push('CAN_END')

    if( hasChangeStartPermission(match)){
        match.permissions.push('CHANGE_START')
    }

    if( hasChangeEndPermission(match)){
        match.permissions.push('CHANGE_END')
    }

    if( hasChangeCourtPermission(match)){
        match.permissions.push('CHANGE_COURT')
    }

    res.locals.match = match

    next()

}

function validatePatchRequest(req,res,next){


    const id = req.params.id ? req.params.id: null

    if( id == null){
        return next(new Error("Request ID missing"))
    }

    const cmd = req.body.cmd ? req.body.cmd: null

    if( cmd == null){
        return next(new Error("Command missing"))
    }

    let cmd_errors = validateCommand(cmd)

    if( cmd_errors.length !== 0 ){
        return next(new Error("Incorrect command"))
    } 

    let param_errors = validateCommandParams(cmd)

    if( param_errors.length !== 0 ){
        return next(new Error("Incorrect command params"))
    } 

    res.locals.cmd = cmd

    next()

}

function validateCommand( cmd ){

    const command_schema = {
        "id": "command_schema",
        "type": "object",
        "properties":{
            "name":{
                "type":"string",
                "enum" : getSupportedCommands()
            },
            "params": {
                "type":"object"
            }
        },
        "required" : ["name","params"]
    }

    
    const vresult = validateSchema(cmd,command_schema)

    return vresult.errors.length !== 0 ? vresult.errors : []
    
}

function validateCommandParams(cmd){


    const cmd_name = cmd.name

    const params_schema = getSchema(cmd_name)

    if( params_schema === null ){
        return ['Failed to get params validation']
    }

    const vresult = validateSchema(cmd.params,params_schema)

    return vresult.errors.length !== 0 ? vresult.errors : []

}

function validateSchema(val,schema){
    const v = new Validator()

    return v.validate(val,schema)

}



module.exports = {
    checkMatchPermissions,
    validatePatchRequest
}