
function hasRemovePermission( match, curr_time = new Date() ){

    var curr_time_ms = curr_time.getTime()
    var start_time_ms = match.utc_start * 1000

    return (start_time_ms + ( 15 * 60 * 1000)) > curr_time_ms ? true: false

}

function hasEndPermission( match, curr_time = new Date() ){
    
    var curr_time_ms = curr_time.getTime()
    var start_time_ms = match.utc_start * 1000
    var end_time_ms = match.utc_end * 1000


    return ( start_time_ms <= curr_time_ms && end_time_ms >= curr_time_ms ) ? true : false

    

}

function hasChangeStartPermission( match, curr_time = new Date() ){

    var curr_time_ms = curr_time.getTime()
    var start_time_ms = match.utc_start * 1000

    return start_time_ms >= curr_time_ms  ? true : false

}

function hasChangeEndPermission( match, curr_time = new Date() ){

    var curr_time_ms = curr_time.getTime()
    var end_time_ms = match.utc_end * 1000

    return end_time_ms >= curr_time_ms  ? true : false

}

/**
 * 
 * @param { Date } start Requested session start time 
 * @param { Date } end Requested session end time
 */
function hasCreatePermission(start,end ){
    var curr_time_ms = new Date().getTime()
    var start_time_ms = start.getTime()
    var end_time_ms = end.getTime()

    var time_offest_allowed = 10 * 60 * 1000

    return start_time_ms > (curr_time_ms - time_offest_allowed) ? true : false
}




module.exports = {
    hasRemovePermission,
    hasEndPermission,
    hasCreatePermission,
    hasChangeEndPermission,
    hasChangeStartPermission
}