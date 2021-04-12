
//TO DO: Document all the rueles for granting permissions

const remove_grace_period = 10 * 60 * 1000;
const create_grace_period = 10 * 60 * 1000;
const update_grace_period = 10 * 60 * 1000;

/**
 * Check if a session can be removed
 * Permission granted if start_time + grace_period > current_time
 * See value for remove_grace_period for exact value
 * Grace period of 10 minutes means a session starting at 9:00 am 
 * can be remove up until 9:10 am.
 *  
 * @param { Object } matchinfo Should contain utc_start and utc_end in seconds 
 * @param { Date } curr_time Optional current time 
 */
function hasRemovePermission( matchinfo, curr_time = new Date() ){

    var curr_time_ms = curr_time.getTime()
    var start_time_ms = matchinfo.utc_start * 1000

    //Only active session can be removable
    if( matchinfo.active !== 1 ){
        return false;
    }

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

/**
 * Check if a session end can change.
 * Permission granted if end_time > now
 * Session ending at 9:00 am 
 * can have it's end time changed up to 8:59 am.
 *  
 * @param { Object } matchinfo Should contain utc_start and utc_end in seconds 
 * @param { Date } curr_time Optional current time 
 */
function hasChangeEndPermission( matchinfo, curr_time = new Date() ){

    var curr_time_ms = curr_time.getTime()
    var end_time_ms = matchinfo.utc_end * 1000

    return end_time_ms > curr_time_ms   ? true : false

}

/**
 * Check if a new session can be created.
 * Permission granted if start_time >= (now - grace_period)
 * See value for create_grace_period for exact value
 * Grace period of 10 minutes means a session starting at 9:00 am 
 * can be created up until 9:10 am
 * @param { Object } matchinfo Should contain utc_start and utc_end in seconds 
 * @param { Date } curr_time Optional current time 
 */
function hasCreatePermission(matchinfo, curr_time = new Date() ){
    
    var curr_time_ms = curr_time.getTime()
    var start_time_ms = matchinfo.utc_start * 1000

    return start_time_ms >= (curr_time_ms - create_grace_period) ? true : false
}

/**
 * Checks if a court can be changed.
 * Permission granted if session_end_time > current_time (session ends in the future) 
 * @param { Object } matchinfo Should contain utc_start and utc_end in seconds 
 * @param { Date } curr_time Optional current time
 */
function hasChangeCourtPermission(matchinfo, curr_time = new Date()){

    var curr_time_ms = curr_time.getTime()
    var end_time_ms = matchinfo.utc_end * 1000

    return end_time_ms > curr_time_ms ? true : false

}

function checkChangeTimePermissions(orig_activity, new_activity){

    //Use current time as the bases for checking permissions
    let curr_time = new Date()

    //Check if start time and end times are the same
    if( 
       (orig_activity.utc_start === new_activity.utc_start) && 
       (orig_activity.utc_end === new_activity.utc_end)
   ){
       return "Time has not changed"
   }

   //Check if start is changing and, if so, check permission
   if( orig_activity.utc_start !== new_activity.utc_start ){
       
       if( ! hasChangeStartPermission(orig_activity, curr_time) ){
           return "Session start too far back in time"
       }

       if( ! ( new_activity.utc_start * 1000 >= (curr_time.getTime() - (10 * 60 * 1000)) )){
           return "New start too far back in time"
       }
   }

   //Check if end is changing and, if so, check permission
   if( orig_activity.utc_end !== new_activity.utc_end ){

       if( ! hasChangeEndPermission(orig_activity, curr_time) ){
           return "Session end too far back in time"
       }

       if( ! ( new_activity.utc_end * 1000 > curr_time.getTime() ) ){
           return "New end must be in future"
       }

   }

   return null

}




module.exports = {
    hasRemovePermission,
    hasEndPermission,
    hasCreatePermission,
    hasChangeEndPermission,
    hasChangeStartPermission,
    hasChangeCourtPermission,
    checkChangeTimePermissions
}