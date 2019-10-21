
function setMatchPermissions(req,res,next) {

    var match = res.locals.match
    var curr_time = new Date()

    match.permissions = []
    
    var curr_time_ms = curr_time.getTime()
    var start_time_ms = match.utc_start * 1000
    var end_time_ms = match.utc_end * 1000

    if( start_time_ms <= curr_time_ms && end_time_ms >= curr_time_ms )
        match.permissions.push('CAN_END')

    if( (start_time_ms + ( 15 * 60 * 1000)) > curr_time_ms )
        match.permissions.push('CAN_REMOVE')

    res.locals.match = match

    next()

}


module.exports = {
    extractMatchPermissions: setMatchPermissions
}