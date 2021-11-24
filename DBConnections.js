const mysql = require('mysql');

function newConnection(){

    let connection = mysql.createConnection({
        host: '//////////',
        user: 'username',
        password: 'password',
        database: '3309database'
    });
    return connection;
}
module.exports = newConnection;