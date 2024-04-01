import "dotenv/config";

// test-setup.js
import { createPool } from "mysql";

const pool_config = {
  connectionLimit: 10,
  host: process.env.SQL_HOST || "localhost",
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  port: process.env.SQL_PORT || 3306,
  connectTimeout: 10000,
  acquireTimeout: 10000,
  waitForConnections: true,
  queueLimit: 0,
  timezone: "Z",
  dateStrings: true,
};

const pool = createPool(pool_config);

/**
 *
 * @returns { Promise<mysql.PoolConnection> }
 */
function getConnection() {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
      } else {
        resolve(connection);
      }
    });
  });
}

// Function to set up the database
async function setupDatabase() {
  // Write your database setup logic here
  const createDatabaseQuery = `CREATE DATABASE IF NOT EXISTS clubhouse_test DEFAULT CHARACTER SET utf8mb4`;

  const connection = await getConnection();
  connection.query(createDatabaseQuery, (err, _result) => {
    if (err) throw err;
  });
  connection.release();
}

// Function to tear down the database
async function teardownDatabase() {
  const dropDatabaseQuery = "DROP DATABASE IF EXISTS clubhouse_test";

  const connection = await getConnection();
  connection.query(dropDatabaseQuery, (err, _result) => {
    if (err) throw err;
  });
  connection.release();
}

// Export the setup and teardown functions
export { setupDatabase, teardownDatabase, getConnection };
