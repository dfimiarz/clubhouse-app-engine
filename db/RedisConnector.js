const redis = require("redis");
const { cloudLog, localLog, cloudLogLevels: loglevels } = require('./../utils/logger/logger');

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

async function connect() {
  await client.connect();
}

/**
 * 
 * @returns Redis client object
 */
function getClient() {
  return client;
}

module.exports = {
  getClient
}