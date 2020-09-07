class RESTError {
    constructor(status = 500, payload = { errors: "Something went wrong"}){
        this._status = status
        this._payload = payload

    }

    get payload(){
        return this._payload
    }

    get status(){
        return this._status
    }
}

module.exports = RESTError