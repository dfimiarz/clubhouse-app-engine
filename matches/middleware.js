const { hasRemovePermission, hasEndPermission } = require('../permissions/MatchPermissions')


function checkMatchPermissions(req,res,next) {

    var match = res.locals.match

    match.permissions = []
    
    if( hasRemovePermission(match))
        match.permissions.push('CAN_REMOVE')

    if( hasEndPermission(match) )
        match.permissions.push('CAN_END')

    res.locals.match = match

    next()

}


module.exports = {
    checkMatchPermissions
}