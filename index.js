var mysql = require('mysql');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');
const { callbackify } = require('util');

var connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: 'maple124',
	database: 'PlaneRental'
});



var app = express();
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(__dirname + 'static'));

app.get('/', function (request, response) {
	response.sendFile(path.join(__dirname + '/static/login.html'));
});

app.post('/auth', function (request, response) {
	var email = request.body.email;
	var password = request.body.password;
	if (email && password) {
		connection.query(`SELECT * FROM Student WHERE studentEmail = "${email}" AND userPassword = "${password}"`, function (error, results, fields) {
			if (error)
				console.log(error);
			else if (results.length > 0) {
				request.session.loggedin = true;
				request.session.email = email;
				for (r of results) {
					request.session.name = r.fName + " " + r.lName;
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

app.get('/home', function (request, response) {
	if (request.session.loggedin) {
		let content = "";
		var facilityPref = "";
		var planeBrand = "";
		var planeCallSign = "";
		var engineType = "";
		var avg_score = "";
		var instructorFName = "";
		var instructorLName = "";
		var ins_avg_score = "";

		function setFacility(callback) {
			connection.query(`Select facilityPref from Student WHERE studentEmail = "${request.session.email}" limit 1`, (err, results, fields) => {
				callback(results);
			});
		}

		async function setPlane(callback) {
			connection.query(`SELECT p.planeCallSign, p.engineType, p.planeBrand, AVG(pr.rating) as avg_score
								FROM Planes p
									INNER JOIN PlaneReview pr on p.planeCallSign = pr.planeCallSign
								WHERE facilityName = "${facilityPref}"
								GROUP BY p.planeCallSign
								ORDER BY avg_score desc
								Limit 1;`, (err, results, fields) => {
				callback(results);
			});
		}

		async function setInstructor(callback) {
			connection.query(`SELECT i.fName, i.lName, AVG(ir.rating) as avg_score
								FROM Instructor i
								INNER JOIN InstructorReview ir on i.instructorEmail = ir.instructorEmail
								GROUP BY i.instructorEmail
								ORDER BY avg_score desc
								Limit 1;`, (err, results, fields) => {
				callback(results);
			});
		}

		setFacility(
			function (res) {
				for (r of res) {
					facilityPref = r.facilityPref;
				}
				setInstructor(
					function (res) {
						for (r of res) {
							instructorFName = r.fName;
							instructorLName = r.lName;
							ins_avg_score = r.avg_score;
						}
						setPlane(
							function (res) {
								for (r of res) {
									planeCallSign = r.planeCallSign;
									engineType = r.engineType;
									planeBrand = r.planeBrand;
									avg_score = r.avg_score;
								}
								toPage();
							}
						)
					}
				)
			}
		);
		function toPage() {
			planeString = planeBrand + " " + planeCallSign + " " + engineType.toUpperCase() + "-ENGINE Rating: " + avg_score + " stars";
			content = `<head>
									<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous">
										<style>
										</style>
					    			</head>
									<body>
										<h1 class="text-center">Western Aviation Plane Booking System</h1>
										<h4 class="text-center">Welcome back ${request.session.name}!</h4><br>
										<div class="container">
											<div class="row">
												<div class="col text-center border">
													<h1>Book A Plane</h1>
													<a href="#">View Facilities</a>
												</div>
												<div class="col text-center border">
													<h1>Your Preferred Facility</h1>
													<h3>${facilityPref}</h3><br>
													<h4>Top Rated Plane:</h4>
													<h4>${planeString}</h4><br>
													<h4>Top Rated Instructor:</h4>
													<h4>${instructorFName + " " + instructorLName + " Rating: " + ins_avg_score + " stars"}</h4>
													<a href="#">Go To Facility</a>
												</div>
											</div>
											<div class="row">
												<div class="col text-center border">
													<h1>View Bookings</h1>
													<a href="#">Go To Bookings</a>
												</div>
												<div class="col text-center border">
													<h1>Your Profile</h1>
													<h4>Name: ${request.session.name}</h4>
													<h4>Email: ${request.session.email}</h4>
													<a href="#">Edit Your Profile<a><br>
													<a href="/logout">Logout</a>
												</div>
											</div>
										</div>
										</body>`;
			response.send(content);
		}
	}
	else {
		response.send('Please login to view this page!');
	}
});

app.get('/logout', function (request, response) {
	if (request.session.loggedin) {
		request.session.destroy();
		response.redirect('/');
	} else {
		response.send('Please login to view this page!');
	}
	response.end();
});

app.listen(80);