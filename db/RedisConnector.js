const Redis = require("ioredis");
const { log, appLogLevels } = require('./../utils/logger/logger');

const client = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT || 6379,
  username: "default",
  password: process.env.REDIS_PASSWORD,
  db: 0,
});

/**
 *  Get a value from redis
 * @param {string} key
 * @returns {Object} value
 * */
async function getJSON(key) {
  try {
    const redisData = await client.call("JSON.GET",key);
    return JSON.parse(redisData);
  } catch (err) {
    log(appLogLevels.ERROR, `Error getting info from redis: ${err}`);
  }
}

/**
 * Store a value in redis
 * @param {String} key Key to set
 * @param {Object} data Data to set
 */
async function storeJSON(key, data) {
  try {
    const result = await client.call("JSON.SET",key, "$", JSON.stringify(data));
  } catch (err) {
    log(appLogLevels.WARNING, `Error saving value to redis: ${err}`);
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
  getClient,
  storeJSON,
  getJSON,
};
