const redis = require("redis");
const {promisify} = require('util');

const client = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
    auth_pass: process.env.REDIS_PASSWORD
});

client.on("error", function(error) {
  console.error(error);
});

const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);
const getDelAsync = promisify(client.set).bind(client);

module.exports = {
    getAsync,
    setAsync,
    getDelAsync
}