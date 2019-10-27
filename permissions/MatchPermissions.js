
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




module.exports = {
    hasRemovePermission,
    hasEndPermission
}