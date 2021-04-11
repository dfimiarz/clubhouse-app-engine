const rateLimit = require("express-rate-limit");

let APILimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200 // limit each IP to 200 requests per windowMs
})

let captchaLimiter = rateLimit({
    windowMs: 2 * 60 * 1000, // 2 minutes
    max: 20 // limit each IP to 100 requests per windowMs
})

module.exports = {
    apilimiter: APILimiter,
    captchalimiter: captchaLimiter
}