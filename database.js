// Make .env work
require('dotenv').config()

// Variables
const { Client } = require('pg');
/**@type { Client } client */
let client;

// Initialize client
if(process.env.ENVIRONMENT == "local") {
    client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        ssl: true
    });
} else if(process.env.ENVIRONMENT == "heroku") {
    client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: true
    });
}
 
// Add DB functions
module.exports = { client }
module.exports.request = request;

/**
 * Calls connect(), then query(), then `whenQueryAnswerReceived` and end().
 * @param {import('pg').Submittable} queryStream 
 * @param {function(*):void} whenQueryAnswerReceived 
 */
function request(queryStream, whenQueryAnswerReceived = (arg0)) {
    client.connect().then(client.query(queryStream).then(receivedAnswer => {
        whenQueryAnswerReceived(receivedAnswer);
        client.end();
    }));
}