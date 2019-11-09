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

commands['REMOVE_SESSION'] = {  
                                vschema: {
                                    "id":"REMOVE_SESSION_SCHEMA",
                                    "type": "object",
                                    "properties":{
                                        "hash":{
                                            "type": "string",
                                            "pattern": /[a-fA-F0-9]{32}/
                                        }
                                    },
                                    "required": ["hash"]
                                },
                                processor: 'removeSession' 
                            }

commands['CHANGE_TIME'] = {
                                vschema: {
                                    "id":"CHANGE_TIME_SCHEMA",
                                    "type": "object",
                                    "properties":{
                                        "hash":{
                                            "type": "string",
                                            "pattern": /[a-fA-F0-9]{32}/
                                        },
                                        "start":{
                                            "type": "string",
                                            "pattern": /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/    
                                        },
                                        "end":{
                                            "type": "string",
                                            "pattern": /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
                                        }
                                    },
                                    "required": ["hash","start","end"]
                                },
                                processor: 'changeSessionTime' 
                            }

commands['CHANGE_COURT'] = {
                                vschema: {
                                    "id":"CHANGE_COURT_SCHEMA",
                                    "type": "object",
                                    "properties":{
                                        "hash":{
                                            "type": "string",
                                            "pattern": /[a-fA-F0-9]{32}/
                                        },
                                        "court":{
                                            "type": "integer"  
                                        }
                                    },
                                    "required": ["hash","court"]
                                },
                                processor: 'changeCourt' 
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