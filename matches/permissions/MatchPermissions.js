
var remove_grace_period = 10 * 60 * 1000;
var create_grace_period = 10 * 60 * 1000;
var update_grace_period = 10 * 60 * 1000;

function hasRemovePermission( match, curr_time = new Date() ){

    var curr_time_ms = curr_time.getTime()
    var start_time_ms = match.utc_start * 1000

    return (start_time_ms + remove_grace_period) > curr_time_ms ? true: false

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

    return start_time_ms >= (curr_time_ms - update_grace_period) ? true : false

}

function hasChangeEndPermission( match, curr_time = new Date() ){

    var curr_time_ms = curr_time.getTime()
    var end_time_ms = match.utc_end * 1000

    return end_time_ms >= ( curr_time_ms - update_grace_period )  ? true : false

}

/**
 * 
 * @param { Object } activityTime Should contain utc_start and utc_end in seconds 
 * @param { Date } curr_time Optional current time
 */
function hasCreatePermission(activityTime, curr_time = new Date() ){
    
    var curr_time_ms = curr_time.getTime()
    var start_time_ms = activityTime.utc_start * 1000

    return start_time_ms >= (curr_time_ms - create_grace_period) ? true : false
}




module.exports = {
    hasRemovePermission,
    hasEndPermission,
    hasCreatePermission,
    hasChangeEndPermission,
    hasChangeStartPermission
}