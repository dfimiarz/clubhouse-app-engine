/*
Booking info properties

id,
utc_start,
utc_end,
utc_day_start,
utc_req_time,
loc_req_date,
loc_req_time,
utc_created,
utc_updated,
date,
numeric_date,
start,
end,
active,
type,
booking_type_desc,
booking_type_lbl,
bumpable,
created,
updated,
notes,
etag,
court_id,
court_open,
court_close,
court_state,
court_name,
time_zone,
club_id,
players: [],
permissions: []

Player properties

person_id,
firstname,
lastname,
person_type_id,
person_type_lbl,
player_type,
player_type_lbl,
player_type_desc

*/

const MATCH_TYPE = 1000;

const MIN_NEW_BOOKING_DURATION = 5 * 60;
const FRESH_BOOKING_THRESHOLD_SEC = 5 * 60;

function courtOpen({court_state}){


    //Check if court state is set and value set to 0 indicating it is closed
    return court_state === 0 ? "Court Closed" : null; 

}

function checkBookingStart({ utc_day_start,court_open,utc_start}){

    //session must start at or after opening time. Opentime given in minutes since midnight
    const daystart = utc_day_start;
    const opentime = daystart + court_open * 60;

    return utc_start < opentime ? "Booking must start after court opens" : null;

}

function checkBookingEnd({ utc_day_start,court_closed,utc_end}){

    //session must end at or befoer closing time. court_closed given in minutes since midnight
    const daystart = utc_day_start;
    const closedtime = daystart + court_closed * 60;

    return utc_end > closedtime ? "Booking must end before court closes" : null;
}

function checkMatchBookingDate({ loc_req_date, numeric_date, type }){

        //console.log(loc_req_date,numeric_date)

        if( type === MATCH_TYPE ){
            return loc_req_date !== numeric_date ? "Matches must be booked for today": null;
        }
        else{
            return null;
        }

}

function checkStartAndEndTime({utc_start,utc_end}){
    return utc_start >= utc_end ? "Session must start before ending " : null;
}

function checkBookingDuration({utc_start,utc_end}){
    return utc_end - utc_start < MIN_NEW_BOOKING_DURATION ? "Session must be at least 5 minutes long" : null
}

function checkBookingNotEnded({utc_end,utc_req_time}){
    
    if(  utc_end < utc_req_time ){
        //Cannot change time for sessions that have ended
        return "Booking has ended";

    } else {
        //Ok to change time for ongoing or future sessions
        return null
    }

}

function checkCancelTimeframe({utc_end,utc_req_time,utc_created,utc_start}){

    if(  utc_end < utc_req_time ){
        //Sessiong that have ended can be cancelled within 5 mintues of creation
        return utc_created + (5 * 60) <= utc_req_time ? "Sessions that have ended can be cancelled within 5 mintute of creation time" : null;

    } else {

        if( utc_start < utc_req_time ){

            if( utc_start < utc_created ){
                //Ongoing sessions booked retroactively can be cancelled within 5 mintues of creation
                return utc_created + (5 * 60) <= utc_req_time ? "Ongoing bookings can be cancelled within 5 mintues of creation time" : null;
            }
            else{
                //Ongoing sessions booked ahead of time can be cancelled within 5 mintues of starting
                return utc_start + FRESH_BOOKING_THRESHOLD_SEC <= utc_req_time ? "Unable to cancel onging booking" : null;
            }

        } else {

            //Future session can be cancelled 
            return null;

        }
    }

}

function isActive({active}){
    return active === 1 ? null : "Booking must be active"
}

function isOngoing({utc_start,utc_end,utc_req_time}){

    return utc_req_time < utc_end && utc_req_time >= utc_start ? null : "Booking must be ongoing";

}

//Fresh booking is one that stared FRESH_BOOKING_THRESHOLD_SEC before utc_req_time
function isNotFreshBooking({utc_start,utc_req_time}){
    return utc_start + FRESH_BOOKING_THRESHOLD_SEC <= utc_req_time ? null : "Booking too fresh"
}

const validators = {
                     "create" : [ courtOpen, checkBookingStart , checkBookingEnd, checkMatchBookingDate, checkStartAndEndTime, checkBookingDuration ],
                     "cancel" : [ isActive, checkCancelTimeframe],
                     "end": [ isActive, isOngoing, isNotFreshBooking],
                     "move": [ isActive, checkBookingNotEnded ]
                    }


module.exports = validators;
