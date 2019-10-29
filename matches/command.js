let commands = {}

commands['END_SESSION'] = {  
                            vschema: {
                                "id":"END_SESSION_SCHEMA",
                                "type": "object",
                                "properties":{
                                    "end_time": {
                                        type: "integer"
                                    },
                                    "hash":{
                                        "type": "string",
                                        "pattern": /[a-fA-F0-9]{32}/
                                    }
                                },
                                "required": ["end_time","hash"]
                            },
                            processor: 'endSession' 
                        }

function hasCommand(cmd_name) {
    return Object.keys(commands).includes(cmd_name) ? true : false
}

function getSchema(cmd_name) {
    return hasCommand(cmd_name) ? commands[cmd_name].vschema : null
}

function getCommands(){
    return Object.keys(commands)
}

/**
 * 
 * @param { String } cmd_name
 */
function getProcessor(cmd_name){
    return hasCommand(cmd_name) ? commands[cmd_name].processor : null
}

module.exports = {
    hasCommand,
    getSchema,
    getSupportedCommands: getCommands,
    getProcessor
}