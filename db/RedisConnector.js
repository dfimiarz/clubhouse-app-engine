const redis = require("redis");
const { cloudLog, cloudLogLevels: loglevels } = require('./../utils/logger/logger');

/**
 * Current number of attempts to report/log error state
 */
let error_log_count = 0;

/**
 * Maxium number of error reports/logs to send
 */
const ERROR_LOG_LIMIT = 5;

/**
 * A flag tracking reporting of connection ready state
 */
let connect_reported = false;

const client = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
  },
  password: process.env.REDIS_PASSWORD
});

client.on("error", function (error) {

  if (error_log_count < ERROR_LOG_LIMIT) {
    error_log_count++;
    cloudLog(loglevels.emergancy, `Redis connection error: ${error.message}. ERROR_COUNT: ${error_log_count}`)
  }

  connect_reported = false;
});

client.on("ready", function () {
  if (!connect_reported) {
    cloudLog(loglevels.info, `Redis connection ready`);
    connect_reported = true;
  }
  error_log_count = 0;

})

try {
  connect();
} catch (err) {
  console.log(err);
}

/**
 * Get redis connection
 */
async function connect() {
  await client.connect();
}

/**
 *  Get a value from redis
 * @param {string} key
 * @returns {Object} value
 * */
async function getJSON(key) {

  try {
    const redisData = await client.json.get(key);
    return JSON.parse(redisData);
  }
  catch (err) {
    cloudLog(loglevels.warning, `Error getting info from redis: ${err}`);
  }

}

/**
 * Store a value in redis
 * @param {String} key Key to set
 * @param {Object} data Data to set
 */
async function storeJSON(key, data) {

  try {
    await client.json.set(key, '.', JSON.stringify(data));
  }
  catch (err) {
    cloudLog(loglevels.warning, `Error saving value to redis: ${err}`);
  }

}

/**
 * 
 * @returns Redis client object
 */
function getClient() {
  return client;
}

module.exports = {
  getClient, storeJSON, getJSON
}