const RESTError = require('./RESTError');

const sql_errors = {
    'ADD_GUEST' : {
        1062: {
            'code': 422,
            'msg' : "Person already exists"
        }
    },
    'ACTIVATE_GUESTS' :{
        1062: {
            'code': 422,
            'msg' : "Guest(s) already activated"
        }
    }
}

function _getError(opcode,sqlerr){

    if (Object.prototype.hasOwnProperty.call(sql_errors,  opcode)){
        
        const opcodeErrs = sql_errors[opcode];

        if(Object.prototype.hasOwnProperty.call(opcodeErrs, sqlerr.errno)){
            return new RESTError(opcodeErrs[sqlerr.errno].code,opcodeErrs[sqlerr.errno].msg);
        }else{
            return new RESTError(500,`Unknown ${opcode} error`);
        }

    }
    else{
        return new RESTError(500);
    }

}

module.exports = {
    getError: _getError
}