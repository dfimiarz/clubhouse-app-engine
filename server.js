'use strict'

const express = require('express')
const createError = require('http-errors')
const cors = require('cors')
const compression = require('compression')
const app = express()
const RESTError = require('./utils/RESTError')


require('dotenv').config()

app.set('trust proxy', true)

const corsOptions = {
    origin: "*", // process.env.CLIENT_URL,
    optionsSuccessStatus: 200
}

app.use(compression())
app.use(cors(corsOptions))


app.get('/', (req,res) => {

    res.json(
        { 
            name: 'Knicks-Tennis API',
            version: '1.0'
        }
    )
})

app.use('/courts', require('./courts/api'))
app.use('/matches', require('./matches/api'))
app.use('/persons', require('./persons/api'))
app.use('/auth', require('./auth/api'))

app.use( (req,res,next) => {
    next(createError(404))
})

app.use( (err,req,res,next) => {

    if( err instanceof RESTError ){
        res.status( err.status )
        .json( err.payload )
    } else {
        res.status(err.status || 500 )
        .json( err.message || 'Something went wrong' )
    }

})


const PORT = process.env.PORT || 8080

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`)
    console.log(`Press Ctrl+C to quit`)
})

module.exports = app