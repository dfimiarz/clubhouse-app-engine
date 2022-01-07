const admin = require('../firebaseadmin/firebaseadmin')
const RESTError = require('../utils/RESTError')
const { cloudLog, localLog, cloudLogLevels: loglevels } = require('./../utils/logger/logger');
const { getUserRole } = require('./../auth/controller');
const club_id = process.env.CLUB_ID;


/**
 * 
 * @param {Request} req Request
 * @param {Response} res Response
 * @param {next} next next function
 */
async function checkUserRole(req, res, next) {

    try {
        if (!res.locals.username) {
            next();
        } else {

            res.locals.role = await getUserRole(res.locals.username, club_id);

            next();
        }
    } catch (err) {
        cloudLog(loglevels.error, `User role error: ${err.message} `);
        next(new Error(`Unable to verify user role: ${err.message}`));
    }
}

/**
 * 
 * @param {Request} req Express Request object
 * @param {Response} res Express Response object
 * @param {next} next next functinon 
 */
async function checkUserAuth(req, res, next) {


    const token = getTokenFromHeaders(req);

    if (token) {

        try {
            const decodedToken = await admin.auth().verifyIdToken(token)
            const uid = decodedToken.uid;

            const user = await admin.auth().getUser(uid);
            res.locals.username = user.email;
            res.locals.userauth = true;

            next()
        }
        catch (err) {
            cloudLog(loglevels.error, `User token error: ${err} `);
            next(new Error("Unable to verify auth token"));
        }
    }
    else {
        next();
    }



}

/**
 * 
 * @param {Request} req Express Request object
 * @param {Response} res Express Response object
 * @param {next} next next functinon 
 * 
 * Middleware checking if X-AUTH-CLIENT header is set. 
 * The header should be only set by proxy server to indicate client is accessing system for a authorized IP address
 * In nginx, geo module can set the header based on IP (http://nginx.org/en/docs/http/ngx_http_geo_module.html)
 */
function checkGeoAuth(req, res, next) {

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
 * @param {Request} req Express Request object
 * @param {Response} res Express Response object
 * @param {next} next next functinon 
 */
function authGuard(req, res, next) {
    if (!(res.locals.geoauth === true || res.locals.userauth === true)) {
        cloudLog(loglevels.error, `Not authorized. IP: ${req.ip} `);
        next(new RESTError(401, "Not authorized"));
    }
    else {
        next();
    }
}

module.exports = { checkUserAuth, checkGeoAuth, authGuard, checkUserRole }