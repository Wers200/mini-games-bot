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
        connectionString: process.env.DATABASE_URL
    });
}
psql_client.connect();

// Add DB functions
module.exports.SendRequest = SendRequest;

/**
 * @param {any} data
 * @returns {Promise<import('pg').QueryResult<any>>}
 */
function SendRequest(data) {
    return psql_client.query(data);
}