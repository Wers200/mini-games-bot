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
        database: process.env.DB_DATABASE,
        ssl: true
    });
} else if(process.env.ENVIRONMENT == "heroku") {
    psql_client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: true
    });
}
 
// Add DB functions
module.exports = psql_client;