const mysql = require('mysql');

    let connection = mysql.createConnection({
        host: '/////////',
        user: 'username',
        password: 'password',
        database: '3309database'
    });

    connection.connect();