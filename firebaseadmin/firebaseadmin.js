const { initializeApp, applicationDefault } = require('firebase-admin/app');

require('dotenv').config();

const app = initializeApp({
    credential: applicationDefault()
})

module.exports = app;