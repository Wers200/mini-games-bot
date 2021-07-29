// Make .env work
require('dotenv').config()

const { Client } = require('pg');
let client;

// Initialize client
if (process.env.ENVIRONMENT == "local") {
    client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });
} else if (process.env.ENVIRONMENT == "heroku") {
    client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: true
    });
}

client.connect();

module.exports = client;