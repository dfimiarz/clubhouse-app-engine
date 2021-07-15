const sqlconnector = require('../db/SqlConnector')
const RESTError = require('./../utils/RESTError');
const { checkPermission } = require('./permissions/BookingPermissions');
const { getBooking, insertBooking, getNewBooking,checkOverlap }  = require('./BookingUtils');

const CLUB_ID = process.env.CLUB_ID;



async function endSession(id,cmd){

    const connection = await sqlconnector.getConnection();

    //Time will be converted from UTC (server) to club time zone
    const update_activity_q = `UPDATE activity SET end = TIME(convert_tz(from_unixtime(?),@@GLOBAL.time_zone,? )) where id = ?`

    try{
        await sqlconnector.runQuery(connection,"START TRANSACTION",[])

        try {
           
            const booking = await getBooking(connection,id,cmd.hash);

            if( ! booking ){
                throw new RESTError(422,"Unable to read booknig data");
            }

            //Check permissions
            const errors = checkPermission('end', booking);
            
            if ( errors.length > 0 ){
                throw new RESTError(422, "Permission to end denied: " + errors[0]);
            }

            await sqlconnector.runQuery(connection,update_activity_q,[booking.utc_req_time,booking.time_zone,id])

            await sqlconnector.runQuery(connection,"COMMIT",[])

            return booking.date;
        }
        catch( err ){

            try{
                await sqlconnector.runQuery(connection,"ROLLBACK",[])
            }
            catch( err ){
                throw err
            }
            
            throw err
        }
    }
    catch( err ) {
        console.log(err)
        throw new Error( err )
    }
    finally
    {
        connection.release()
    }
}

async function removeSession(id,cmd){        

    const remove_activity_q = `UPDATE activity SET active = 0 where id = ?`

    const connection = await sqlconnector.getConnection()

    try{
        await sqlconnector.runQuery(connection,"START TRANSACTION",[])

        try {
            const booking = await getBooking(connection,id,cmd.hash);

            if( ! booking ){
                throw new RESTError(422,"Unable to read booknig data");
            }

            console.log(booking);
            //Check permissions
            const errors = checkPermission('cancel', booking);
            
            if ( errors.length > 0 ){
                throw new RESTError(422, "Permission to remove denied: " + errors[0]);
            }

            await sqlconnector.runQuery(connection,remove_activity_q,[id])

            await sqlconnector.runQuery(connection,"COMMIT",[])

            return booking.date;
        }
        catch( err ){

            try{
                await sqlconnector.runQuery(connection,"ROLLBACK",[])
            }
            catch( err ){
                throw err
            }
            
            throw err
        }
    }
    catch( err ){
        throw err
    }
    finally{
        connection.release()
    }

    
}

async function changeSessionTime(id,cmd){
   
            
    const connection = await sqlconnector.getConnection()

    const new_start = cmd.start
    const new_end = cmd.end

    try{

        await sqlconnector.runQuery(connection,"START TRANSACTION READ WRITE",[])

        try{
            const booking = await getBooking(connection,id,cmd.hash);

            if( ! booking ){
                throw new RESTError(422,"Unable to read booknig data");
            }
            
            //Check permissions to move
            const move_errors = checkPermission('move', booking);
        
            if ( move_errors.length > 0 ){
                throw new RESTError(422, "Permission to move denied: " + move_errors[0]);
            }

            const remove_activity_q = `UPDATE activity SET active = 0 where id = ?`
                
            await sqlconnector.runQuery(connection,remove_activity_q,[id])

             const initValues = {
                court: booking.court_id,
                start: new_start,
                date: booking.date,
                end: new_end,
                notes: booking.notes,
                bumpable: booking.bumpable,
                type: booking.type,
                players: Array.from(booking.players)
            }

            const movedbooking = await getNewBooking(connection,initValues);

             //Check permissions
             const create_errors = checkPermission('create', movedbooking);
             if (create_errors.length > 0) {
                 throw new RESTError(422, "Create permission denied: " + create_errors[0]);
             }

             //START Check for overlapping bookings
             const overlap = await checkOverlap(connection,movedbooking.end,movedbooking.start,movedbooking.court_id,movedbooking.date);

             if( overlap === 1){
                 throw new RESTError(422,"Booking overlap found.");
             }
             //END

             await insertBooking(connection,movedbooking);

            return movedbooking.date;
        }
        catch( err ){

            await sqlconnector.runQuery(connection,"ROLLBACK",[])
            throw err
        }
    }
    catch( err ){

        console.log(err)
        throw err
    }
    finally{
        connection.release()
    }
}



async function changeCourt(id,cmd){

    const connection = await sqlconnector.getConnection();

    const new_court = cmd.court;

    try{

        await sqlconnector.runQuery(connection,"START TRANSACTION READ WRITE",[]);

        try{
            const booking = await getBooking(connection,id,cmd.hash);

            if( ! booking ){
                throw new RESTError(422,"Unable to read booknig data");
            }

            //Check permissions to move
            const move_errors = checkPermission('move', booking);
            
            if ( move_errors.length > 0 ){
                throw new RESTError(422, "Permission to move denied: " + move_errors[0]);
            }
        
            //Check if court is changing
            if( booking.court_id === new_court ){
                throw new RESTError(422, "Court has not changed");
            }

            let initValues = null;

            if( booking.utc_start  > booking.utc_req_time ){
                //Session is in the future so change the court right away
                const remove_activity_q = `UPDATE activity SET active = 0 where id = ?`
                
                await sqlconnector.runQuery(connection,remove_activity_q,[id]);

                initValues = {
                    court: new_court,
                    start: booking.start,
                    date: booking.date,
                    end: booking.end,
                    notes: booking.notes,
                    bumpable: booking.bumpable,
                    type: booking.type,
                    players: Array.from(booking.players)
                }

            }
            else{
               
                const end_booking_q = `UPDATE activity SET end = ? where id = ?`
                
                await sqlconnector.runQuery(connection,end_booking_q,[booking.loc_req_time,id])

                initValues = {
                    court: new_court,
                    start: booking.loc_req_time,
                    date: booking.date,
                    end: booking.end,
                    notes: booking.notes,
                    bumpable: booking.bumpable,
                    type: booking.type,
                    players: Array.from(booking.players)
                }

                
            }

            const movedbooking = await getNewBooking(connection,initValues);
  

            //Check permissions
            const errors = checkPermission('create', movedbooking);
            if (errors.length > 0) {
                throw new RESTError(422, "Create permission denied: " + errors[0]);
            }

            //START Check for overlapping bookings
            const overlap = await checkOverlap(connection,movedbooking.end,movedbooking.start,movedbooking.court_id,movedbooking.date);

            if( overlap === 1){
                throw new RESTError(422,"Booking overlap found. Pick a different court");
            }
            //END

            await insertBooking(connection,movedbooking);

            await sqlconnector.runQuery(connection,"COMMIT",[])

            return movedbooking.date;

        }
        catch( err ){

            await sqlconnector.runQuery(connection,"ROLLBACK",[])
            throw err
            
        }
    }
    catch( err ){
        console.log(err)
        throw err
    }
    finally{
        connection.release()
    }

} 



module.exports = {
    endSession,
    removeSession,
    changeSessionTime,
    changeCourt,
}