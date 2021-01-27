var admin = require('firebase-admin');

require('dotenv').config();

const app = admin.initializeApp({
    credential: admin.credential.applicationDefault()
})

module.exports = app;