const admin = require('../firebaseadmin/firebaseadmin')
const RESTError = require('../utils/RESTError')

require('dotenv').config();


/**
 * 
 * @param {Request} req Express Request object
 * @param {Response} res Express Response object
 * @param {next} middleware next functinon 
 */
async function checkUserAuth(req, res, next) {


    const token = getTokenFromHeaders(req);

    if (token) {

        try {
            const decodedToken = await admin.auth().verifyIdToken(token)
            const uid = decodedToken.uid;

            const user = await admin.auth().getUser(uid);

            res.locals.userauth = true;

            next()
        }
        catch (err) {
            next(new Error("Unable to verify auth token"));
        }
    }
    else{
        next();
    }
    


}

/**
 * 
 * @param {Request} req Express Request object
 * @param {Response} res Express Response object
 * @param {next} middleware next functinon 
 * 
 * Middleware checking if X-AUTH-CLIENT header is set. 
 * The header should be only set by proxy server to indicate client is accessing system for a authorized IP address
 * In nginx, geo module can set the header based on IP (http://nginx.org/en/docs/http/ngx_http_geo_module.html)
 */
function checkGeoAuth(req, res ,next){

    res.locals.geoauth = req.header('X-AUTH-CLIENT') === "1";

    next();
}

/**
 * 
 * @param {Request} req Express Request object 
 */
function getTokenFromHeaders(req) {

    const bearerHeader = req.headers['authorization'];

    if (bearerHeader) {
        const bearer = bearerHeader.split(' ');
        const bearerToken = bearer[1];
        return bearerToken;
    } else {
        return null;
    }
}

/**
 * 
 * @param {Request} _req Express Request object
 * @param {Response} res Express Response object
 * @param {next} middleware next functinon 
 */
function authGuard(_req,res,next){
    if( ! (res.locals.geoauth === true || res.locals.userauth === true) ){
        next(new RESTError(401,"Not authorized"));
    }
    else{
        next();
    }
}

module.exports = { checkUserAuth, checkGeoAuth, authGuard }