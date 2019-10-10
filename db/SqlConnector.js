const mysql = require('mysql')

//Configuration option for the connection pool. See mysql docs for details
const config = {
    connectionLimit: 10,
    host: process.env.SQL_HOST | 'localhost',
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DATABASE,
    port: process.env.SQL_PORT | 3306,
    connectTimeout: 10000,
    acquireTimeout: 10000,
    waitForConnections: true,
    queueLimit: 0


}

// If NODE_ENV === 'production' Unix socket name is defined. use the CLOUD_SQL_CONNECTION_NAME
// Currently, needed to connect to google cloud sql from app engine
if (process.env.CLOUD_SQL_CONNECTION_NAME && process.env.NODE_ENV === 'production') {
    config.socketPath = `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`;
  }

const pool = mysql.createPool(config)


//Return the connection pool
function getPool() {
    return pool
}

//Create a connection from the pool.
function getConnection() {
    return new Promise((resolve,reject) => {
        pool.getConnection((err,connection) => {
                if( err ){
                    reject( err )
                }
                else{
                    resolve( connection )
                }
            })
    })
}

/**
 * 
 * @param { Connection } connection     Database connection object
 * @param { String } query              SQL Query to run
 * @param { Array } values              Values to pass to the query
 */
function runQuery(connection,query,values = []){
    return new Promise((resolve,reject) => {
        connection.query(query,values,(err,results,fields) => {
            if( err )
                reject( err )
            else
                resolve(results)
        })  
    })
}



module.exports = {
    getPool,
    getConnection,
    runQuery
}