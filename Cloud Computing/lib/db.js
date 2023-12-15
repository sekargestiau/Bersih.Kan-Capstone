const mysql = require('mysql')

const connection = mysql.createPool({
    connectionLimit: 10,
    host: "34.101.86.165",
    user: "root",
    database: "api_backend",
    password: "password"
})

module.exports = connection;
