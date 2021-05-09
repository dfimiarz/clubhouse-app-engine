const Validator = require('jsonschema').Validator

const v = new Validator();

/**
 * 
 * @param {string} cmd  Command name
 * @param {*} supportedCommands List of supported commands
 * @returns 
 */
function validateCommand( cmd, supportedCommands ){

    if( ! (Array.isArray(supportedCommands) && supportedCommands.length > 0)){
        throw new TypeError("supportedCommands must be a non empty array")
    }

    const command_schema = {
        "id": "command_schema",
        "type": "object",
        "properties":{
            "name":{
                "type":"string",
                "enum" : supportedCommands
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

function validateCommandParams(cmd,params_schema){


    const cmd_name = cmd.name

    if( params_schema === null ){
        return ['Params schema not found']
    }

    const vresult = validateSchema(cmd.params,params_schema)

    return vresult.errors.length !== 0 ? vresult.errors : []

}

function validateSchema(val,schema){
    
    return v.validate(val,schema)

}

module.exports = {
    validateCommand,
    validateCommandParams
}