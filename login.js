var mysql = require('mysql');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');

var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : 'maple124',
	database : 'PlaneRental'
});

var app = express();
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

app.get('/', function(request, response) {
	response.sendFile(path.join(__dirname + '/static/login.html'));
});

app.post('/auth', function(request, response) {
	var email = request.body.email;
	var password = request.body.password;
	if (email && password) {
		connection.query(`SELECT * FROM Student WHERE studentEmail = "${email}" AND userPassword = "${password}"`, function(error, results, fields) {
			if (error)
				console.log(error);
			else if (results.length > 0) {
				request.session.loggedin = true;
				request.session.email = email;
                for (r of results) {
                    request.session.name = r.fName+" "+r.lName;
                }
				response.redirect('/home');
			} else {
				response.send('Incorrect Email and/or Password!');
			}			
			response.end();
		});
	} else {
		response.send('Please enter Email and Password!');
		response.end();
	}
});

app.get('/home', function(request, response) {
	if (request.session.loggedin) {
		response.send('Welcome back, ' + request.session.name + '!');
	} else {
		response.send('Please login to view this page!');
	}
	response.end();
});

app.listen(80);