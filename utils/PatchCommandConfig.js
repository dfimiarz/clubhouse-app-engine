class PatchCommandConfig{
    #commands = {}
    
    constructor(  ){
        
    }

    /**
     * 
     * @param { string } cmd_name Command name
     * @param { object } schema JSON schema for cmd_name
     */
    addCommand(cmd_name,cschema,processor){

        //TO DO: Validate cmd_name, cschema, processor
        this.#commands[cmd_name] = {
            processor: processor,
            cschema: Object.assign({},cschema)
        }
    }

    /**
     * 
     * @param { string } cmd_name Command name 
     * @returns boolean
     */
    hasCommand(cmd_name) {
        return Object.keys(this.#commands).includes(cmd_name) ? true : false
    }

    /**
     * 
     * @param { string } cmd_name Name of a command 
     * @returns JSON schema definition for cmd_name
     */
    getSchema(cmd_name) {
        return hasCommand(cmd_name) ? this.#commands[cmd_name].cschema : null
    }

    /**
     * 
     * @returns List of supported commands
     */
    getCommands(){
        return Object.keys(this.#commands)
    }

    /**
     * 
     * @param { String } cmd_name Returns name of the command processor for cmd_name
     */
    getProcessor(cmd_name){
        return hasCommand(cmd_name) ? this.#commands[cmd_name].processor : null
    }

}

module.exports = PatchCommandConfig