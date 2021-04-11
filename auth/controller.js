const { v4: uuidv4 } = require('uuid');
const { getAsync, setAsync } = require('./../db/RedisConnector')
const svgCaptcha = require('svg-captcha')
const RESTError = require('./../utils/RESTError');

const EXP_TIME = 120; //Capcha expired in 120 seconds

/**
 * 
 * @returns { Object } Captch params
 */
async function getCaptcha(){

    const captcha = svgCaptcha.create({size: 5, noise: 2});
    const requestid = uuidv4();
    const text = captcha.text;
    
    await setAsync(requestid,text,'EX', EXP_TIME);

    return {svg: encodeURIComponent(captcha.data),reqid: requestid}

}

async function verifyCaptcha(requestid,text){

    const res = await getAsync(requestid)

    if( ! res ){
        throw new RESTError(422,{ epayload: [{ fielderrors: "requestid", msg: "Captcha expired" }] });
    }

    return res === text

}


module.exports = {
    getCaptcha,
    verifyCaptcha
}