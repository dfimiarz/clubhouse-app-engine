'use strict'

require('dotenv').config();

const express = require('express')
const createError = require('http-errors')
const cors = require('cors')
const compression = require('compression')
const app = express()
const RESTError = require('./utils/RESTError')
const { checkUserAuth,checkGeoAuth, checkUserRole } = require('./middleware/clientauth')
const { cloudLog, localLog, cloudLogLevels : loglevels } = require('./utils/logger/logger');

app.set('trust proxy', true)

console.log("Permitted client", process.env.CLIENT_URL);

const corsOptions = {
    origin: process.env.CLIENT_URL,
    optionsSuccessStatus: 200,
    credentials: true,
    exposedHeaders: ['Etag']
}

app.use(compression())
app.use(cors(corsOptions))

app.use(checkGeoAuth,checkUserAuth,checkUserRole)

app.get('/', (req,res) => {

    res.json(
        { 
            name: 'Knicks-Tennis API',
            version: '1.0'
        }
    )
})
app.use('/alive',(_req,res,_next) => {
    res.status(200).json({ status: "ok"})
})

app.use('/courts', require('./courts/api'))
app.use('/bookings', require('./bookings/api'))
app.use('/persons', require('./persons/api'))
app.use('/auth', require('./auth/api'))
app.use('/guest_activations', require('./guest_activations/api'))
app.use('/booking_types', require('./booking_types/api'))
app.use('/club_schedule', require('./club_schedule/api'))

app.use( (req,res,next) => {
    next(createError(404))
})

app.use( (err,req,res,next) => {

    if( err instanceof RESTError ){
        res.status( err.status ).json( err.payload )
    } else {
        cloudLog(loglevels.error,err.message);
        res.status(err.status || 500 ).json( err.message || 'Something went wrong' )
    }

})


const PORT = process.env.PORT || 8080

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`)
    console.log(`Press Ctrl+C to quit`)
})

module.exports = app