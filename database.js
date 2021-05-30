// Make .env work
require('dotenv').config()

// Variables
const { Client } = require('pg');
/**@type { Client } psql_client */
let psql_client;

// Initialize psql_client
if(process.env.ENVIRONMENT == "local") {
    psql_client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });
} else if(process.env.ENVIRONMENT == "heroku") {
    psql_client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: true
    });
}
psql_client.connect();

// Add DB functions
module.exports.ConnectToDB = ConnectToDB;
module.exports.SendRequestToDB = SendRequestToDB;
module.exports.DisconnectFromDB = DisconnectFromDB;

/**
 * Calls connect().
 * @returns {Promise<void>}
 */
function ConnectToDB() { 
    return psql_client.connect(); 
}

/**
 * Calls query().
 * @param {String} request
 * @returns {Promise<import('pg').QueryResult<any>>}
 */
function SendRequestToDB(request) {
    return psql_client.query(request);
}

/**
 * Calls end().
 * @returns {Promise<void>}
 */
function DisconnectFromDB() {
    return psql_client.end();
}