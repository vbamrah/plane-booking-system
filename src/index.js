var mysql = require('mysql');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');

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

		let planeString = "No Top Rated Plane at this Facility";

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
								if (res.length > 0) {
									for (r of res) {
										planeCallSign = r.planeCallSign;
										engineType = r.engineType;
										planeBrand = r.planeBrand;
										avg_score = r.avg_score;
										planeString = planeBrand + " " + planeCallSign + " " + engineType.toUpperCase() + "-ENGINE Rating: " + avg_score + " stars";
									}
								}
								toPage();
							}
						)
					}
				)
			}
		);
		function toPage() {
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
													<a href="/facilitylist">View Facilities</a><br><br><br><br>
													<h1>View Reviews</h1>
													<a href="/reviews">View Reviews</a>
												</div>
												<div class="col text-center border">
													<h1>Your Preferred Facility</h1>
													<h3>${facilityPref}</h3><br>
													<h4>Top Rated Plane:</h4>
													<h4>${planeString}</h4><br>
													<h4>Top Rated Instructor:</h4>
													<h4>${instructorFName + " " + instructorLName + " Rating: " + ins_avg_score + " stars"}</h4>
													<form action="/facility" method="post">
														<input type="hidden" name="facilityName" value="${facilityPref}">
														<button class="btn btn-secondary float-right" type="submit" name="submit">View Facility</button>
													</form>
												</div>
											</div>
											<div class="row">
												<div class="col text-center border">
													<h1>View Bookings</h1>
													<a href="/bookings">Go To Bookings</a>
												</div>
												<div class="col text-center border">
													<h1>Your Profile</h1>
													<h4>Name: ${request.session.name}</h4>
													<h4>Email: ${request.session.email}</h4>
													<a href="/edit-profile">Edit Your Profile<a><br>
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

app.get('/edit-profile', function (request, response) {
	if (request.session.loggedin) {
		facilities = "";
		facilityPref = "";

		function getFacilities(callback) {
			connection.query(`SELECT DISTINCT facilityName
			FROM Facility`, (err, results, fields) => {

				callback(results);
			});
		}

		content = `<head>
		<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous">

		</head>
		<body>
			<h1 class="text-center">Western Aviation Plane Booking System</h1><br>
			<div class="container">
				<div class="row">
					<div class="col text-center border">
						<h3>Edit Your Profile</h3><br>
						<h4>Name: ${request.session.name}</h4>
						<h4>Email: ${request.session.email}</h4>
						<form action="/update" method="post">`;

		getFacilities(
			function (res) {
				facilities += `<label for="facilityPref">Choose a Preferred Facility:</label>
				<select id="facilityPref" name = "facilityPref" required>`;
				for (r of res) {
					facilities += `<option value="${r.facilityName}">${r.facilityName}</option>`;
				}
				facilities += `</select><br>`;
				content += facilities;
				content += `
			<br><button class="btn btn-secondary" type="submit" name="submit">Save</button>
						</form>
					</div>
				</div>
			</div>
		</body>`;
				response.send(content);

			}
		)
	} else {
		response.send('Please login to view this page!');
	}
});

app.post('/update', function (request, response) {
	if (request.session.loggedin) {
		facilityName = request.body.facilityPref;

		function updateFacilityPref(callback) {
			connection.query(`UPDATE Student
			SET facilityPref = '${facilityName}'
			WHERE studentEmail = "${request.session.email}"`, (err, results, fields) => {
				if (err) {
					console.log(err);
				}
				callback(results);
			});
		}

		updateFacilityPref(
			function (res) {
				response.redirect('/home');
			}
		)
	}
	else {
		response.send('Please login to view this page!');
	}
});

app.get('/facilitylist', function (request, response) {
	if (request.session.loggedin) {
		function getFacilityPref(callback) {
			connection.query(`SELECT facilityPref from Student WHERE studentEmail ="${request.session.email}"`, (err, results, fields) => {
				callback(results);
			})
		}
		function getFacilities(callback) {
			connection.query(`SELECT * from Facility`, (err, results, fields) => {
				callback(results);
			});
		}
		content = `<head>
		<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous">
			<style>
			</style>
		</head>
		<body>
			<h1 class="text-center">Western Aviation Plane Booking System</h1>
			<h2 class="text-center">Facility List</h2><br>
			<div class="container">`
			;
		getFacilityPref(
			function (res) {
				for (r of res) {
					facilityPref = r.facilityPref
				}
				getFacilities(
					function (res) {
						for (r of res) {
							if (facilityPref == r.facilityName) {
								facilityName = r.facilityName + " - Preferred Location";
							}
							else {
								facilityName = r.facilityName
							}
							content += `<div class=row>
								<div class="col border w-80">
									<br>
									<h4 style="float: left;">${facilityName}</h4><br><br>
									<h5 style="float: left;">Postal Code: ${r.postalCode.toUpperCase()}</h5>
									<form action="/facility" method="post" style="float: right;">
										<input type="hidden" name="facilityName" value="${r.facilityName}">
										<button class="btn btn-secondary float-right" type="submit" name="submit">View Facility</button>
									</form>
									<br>
								</div>
							</div>`;
						}
						content += `</body>`
						response.send(content);
					}
				)
			}
		)
	}
	else {
		response.send('Please login to view this page!');
	}
});

app.post('/facility', function (request, response) {
	if (request.session.loggedin) {
		planeBrands = "";
		engineTypes = "";
		let facilityName = request.body.facilityName;

		function getPlaneBrands(callback) {
			connection.query(`SELECT DISTINCT planeBrand
			FROM Planes
			WHERE facilityName = "${facilityName}"`, (err, results, fields) => {
				callback(results);
			});
		}
		function getEngineTypes(callback) {
			connection.query(`SELECT DISTINCT engineType
			FROM Planes
			WHERE facilityName = "${facilityName}"`, (err, results, fields) => {
				callback(results);
			});
		}
		function getReviews(callback) {
			connection.query(`SELECT p.planeCallSign, p.engineType, p.planeBrand, pr.reviewComment, pr.rating, pr.dateTimePosted
			FROM Planes p
				INNER JOIN PlaneReview pr on p.planeCallSign = pr.planeCallSign
			WHERE facilityName = "${facilityName}"
			ORDER by pr.dateTimePosted DESC
			Limit 5`, (err, results, fields) => {
				callback(results);
			});

		}

		content = `<head>
		<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous">

		</head>
		<body>
			<h1 class="text-center">Western Aviation Plane Booking System</h1>
			<h2 class="text-center">${facilityName}</h2><br>
			<h2 class="text-center">DEC</h2>
			<table border="1" class="table table-bordered">`;

		getPlaneBrands(
			function (res) {
				for (r of res) {
					planeBrands += `
					<input type="radio" id="${r.planeBrand}" name="planeBrand" value="${r.planeBrand}">
					<label for="${r.planeBrand}">${r.planeBrand}</label><br>
					`;
				}
				planeBrands += `
				<input type="radio" id="anyBrand" name="planeBrand" value="anyBrand" required>
				<label for="anyBrand">Any Brand</label><br></br>
				`;
				getEngineTypes(
					function (res) {
						for (r of res) {
							engineTypes += `
							<input type="radio" id="${r.engineType}" name="engineType" value="${r.engineType}">
							<label for="${r.engineType}">${r.engineType}</label><br>
							`;
						}
						engineTypes += `
						<input type="radio" id="anyEngine" name="engineType" value="anyEngine" required>
						<label for="anyEngine">Any Engine</label><br></br>
						`;
						toPage();
					}
				)
			}
		)
		function toPage() {
			dayNum = -2;
			var currentTime = new Date();
			let currDay = currentTime.getDate();
			for (let i = 0; i < 5; i++) {
				content += "<tr>"
				for (let j = 0; j < 7; j++) {
					if (dayNum >= currDay + 1 && dayNum <= 31) {
						content += `<td>
					${dayNum}<br>`;
						for (let k = 0; k < 3; k++) {
							timeslot = "";
							if (k == 0) {
								timeslot = "9AM";
								hr24 = "09:00:00";
							}
							if (k == 1) {
								timeslot = "12PM";
								hr24 = "12:00:00";
							}
							if (k == 2) {
								timeslot = "3PM";
								hr24 = "15:00:00";
							}
							content += `
						<!-- Button trigger modal -->
						<button type="button" class="btn btn-secondary" data-bs-toggle="modal" data-bs-target="#DEC${dayNum}${k}">
						${timeslot}
						</button><br>

						<!-- Modal -->
						<div class="modal fade" id="DEC${dayNum}${k}" tabindex="-1" aria-labelledby="DEC${dayNum}${k}Label" aria-hidden="true">
							<div class="modal-dialog">
								<div class="modal-content">
									<div class="modal-header">
										<h5 class="modal-title" id="DEC${dayNum}${k}Label">DEC ${dayNum} ${timeslot}</h5>
										<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
									</div>
									<div class="modal-body">
										<form action="/book" method="post">
											<input type="hidden" name="facilityName" value="${facilityName}">
											<input type="hidden" name="dateTimeSlot" value="2021-12-${dayNum} ${hr24}">
											<p>Select preferred plane brand:</p>` +
								planeBrands +
								`<p>Select preferred engine type:</p>` +
								engineTypes + `
											<button class="btn btn-secondary float-right" type="submit" name="submit">Next</button>
										</form>
									</div>
								</div>
							</div>
						</div>
						`;

						}
					}
					else { content += "<td></td>" }
					dayNum++;
				}
				content += `</tr>`;
			}
			content += `</table>
		<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-ka7Sk0Gln4gmtz2MlQnikT1wXgYsOg+OMhuP+IlRH9sENBO0LRn5q+8nbTov4+1p" crossorigin="anonymous"></script>`;
			getReviews(
				function (res) {
					if (res.length > 0)
						content += `
					<div class="text-center">
						<h2>Most Recent Reviews</h2><br>
						<a href="/reviews">View all reviews</a>
					</div>
					`;
					for (r of res) {
						planeString = r.planeBrand + " " + r.planeCallSign + " " + r.engineType.toUpperCase() + "-ENGINE Rating: " + r.rating + " stars";
						content += `<div class=row>
						<div class="col border w-80">
							<br>
							<h4 style="float: left;">${planeString}</h4><br><br>
							<h5 style="float: left;">Comment: ${r.reviewComment}</h5><br><br>
							<h6 style="float: left;">Posted: ${r.dateTimePosted}</h6>
							<br>
						</div>
					</div>`;
					}
					content += `</body>`
					response.send(content);
				}
			)
		}
	} else {
		response.send('Please login to view this page!');
	}
});

app.post('/book', function (request, response) {
	if (request.session.loggedin) {
		let facilityName = request.body.facilityName;
		let dateTimeSlot = request.body.dateTimeSlot;
		let engineType = request.body.engineType;
		let planeBrand = request.body.planeBrand;

		let instructors = "";
		let planes = "";

		let content = "";

		function getInstructors(callback) {
			connection.query(`SELECT *
			FROM Instructor WHERE instructorEmail NOT IN (
				SELECT i.instructorEmail
					FROM Instructor i
						LEFT JOIN InstructorSchedule ins on i.instructorEmail = ins.instructorEmail
					WHERE ins.dateTimeSlot = "${dateTimeSlot}"
				)`, (err, results, fields) => {
				callback(results);
			});
		}
		function getPlanesWithPrefs(callback) {
			connection.query(`SELECT *
			FROM Planes WHERE facilityName="${facilityName}" && engineType="${engineType}" && planeBrand="${planeBrand}"  && planeCallSign NOT IN (
				SELECT p.planeCallSign
						FROM Planes p
							LEFT JOIN PlaneSchedule ps on p.planeCallSign = ps.planeCallSign
						WHERE ps.dateTimeSlot = "${dateTimeSlot}"
			)`, (err, results, fields) => {
				callback(results);
			});
		}

		function getPlanesWithBrandPref(callback) {
			connection.query(`SELECT *
			FROM Planes WHERE facilityName="${facilityName}" && planeBrand="${planeBrand}"  && planeCallSign NOT IN (
				SELECT p.planeCallSign
						FROM Planes p
							LEFT JOIN PlaneSchedule ps on p.planeCallSign = ps.planeCallSign
						WHERE ps.dateTimeSlot = "${dateTimeSlot}"
			)`, (err, results, fields) => {
				callback(results);
			});
		}

		function getPlanesWithEnginePref(callback) {
			connection.query(`SELECT *
			FROM Planes WHERE facilityName="${facilityName}" && engineType="${engineType}" && planeCallSign NOT IN (
				SELECT p.planeCallSign
						FROM Planes p
							LEFT JOIN PlaneSchedule ps on p.planeCallSign = ps.planeCallSign
						WHERE ps.dateTimeSlot = "${dateTimeSlot}"
			)`, (err, results, fields) => {
				callback(results);
			});
		}

		function getPlanesWithNoPrefs(callback) {
			connection.query(`SELECT *
			FROM Planes WHERE facilityName="${facilityName}" && planeCallSign NOT IN (
				SELECT p.planeCallSign
						FROM Planes p
							LEFT JOIN PlaneSchedule ps on p.planeCallSign = ps.planeCallSign
						WHERE ps.dateTimeSlot = "${dateTimeSlot}"
			)`, (err, results, fields) => {
				callback(results);
			});
		}


		getInstructors(
			function (res) {
				instructors += `<label for="instructor">Choose an Instructor:</label>
				<select id="instructor" name = "instructor" required>`;
				for (r of res) {
					instructors += `<option value="${r.instructorEmail}">${r.fName} ${r.lName}</option>`;
				}
				instructors += `</select><br>`;
				if (engineType != "anyEngine" && planeBrand != "anyBrand") {
					getPlanesWithPrefs(
						function (res) {
							planes += `<label for="plane">Choose a Plane:</label>
							<select id="plane" name = "plane" required>`;
							for (r of res) {
								planeString = r.planeBrand + " " + r.planeCallSign + " " + r.engineType.toUpperCase() + "-ENGINE";
								planes += `<option value="${r.planeCallSign}">${planeString}</option>`;
							}
							planes += `</select><br>`
							toPage();
						}
					)
				}
				else if (engineType != "anyEngine" && planeBrand == "anyBrand") {
					getPlanesWithEnginePref(
						function (res) {
							planes += `<label for="plane">Choose a Plane:</label>
							<select id="plane" name = "plane" required>`;
							for (r of res) {
								planeString = r.planeBrand + " " + r.planeCallSign + " " + r.engineType.toUpperCase() + "-ENGINE";
								planes += `<option value="${r.planeCallSign}">${planeString}</option>`;
							}
							planes += `</select><br>`
							toPage();
						}
					)
				}
				else if (engineType == "anyEngine" && planeBrand != "anyBrand") {
					getPlanesWithBrandPref(
						function (res) {
							planes += `<label for="plane">Choose a Plane:</label>
							<select id="plane" name = "plane" required>`;
							for (r of res) {
								planeString = r.planeBrand + " " + r.planeCallSign + " " + r.engineType.toUpperCase() + "-ENGINE";
								planes += `<option value="${r.planeCallSign}">${planeString}</option>`;
							}
							planes += `</select><br>`
							toPage();
						}
					)
				}
				else if (engineType == "anyEngine" && planeBrand == "anyBrand") {
					getPlanesWithNoPrefs(
						function (res) {
							planes += `<label for="plane">Choose a Plane:</label>
							<select id="plane" name = "plane" required>`;
							for (r of res) {
								planeString = r.planeBrand + " " + r.planeCallSign + " " + r.engineType.toUpperCase() + "-ENGINE";
								planes += `<option value="${r.planeCallSign}">${planeString}</option>`;
							}
							planes += `</select><br>`
							toPage();
						}
					)
				}
			}
		)

		function toPage() {
			content += `<head>
			<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous">
	
			</head>
			<body>
				<h1 class="text-center">Western Aviation Plane Booking System</h1>
				<h2 class="text-center">${facilityName} - ${dateTimeSlot}</h2><br>
				<div class="container">
					<div class="row">
						<div class="col text-center border">
							<h3>Book A Plane</h3>
							<form action="/add-booking" method="post">
								<input type="hidden" name="facilityName" value="${facilityName}">
								<input type="hidden" name="dateTimeSlot" value="${dateTimeSlot}">` +
				planes +
				instructors + `
								<br><button class="btn btn-secondary float-right" type="submit" name="submit">Add Booking</button>
							</form>
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

app.post('/add-booking', function (request, response) {
	if (request.session.loggedin) {
		let facilityName = request.body.facilityName;
		let dateTimeSlot = request.body.dateTimeSlot;
		let instructorEmail = request.body.instructor;
		let planeCallSign = request.body.plane;
		let bookingRef = "";

		let content = "";

		function checkTimeSlot(callback) {
			connection.query(`SELECT * 
			FROM Bookings
			WHERE studentEmail ="${request.session.email}" && dateTimeSlot="${dateTimeSlot}"`, (err, results, fields) => {
				if (err) {
					response.send(err);
				}
				callback(results);
			});
		}

		function addToPlaneSchedule(callback) {
			connection.query(`INSERT INTO PlaneSchedule
			VALUES("${dateTimeSlot}", "${planeCallSign}", "${facilityName}")`, (err, results, fields) => {
				if (err) {
					response.send(err);
				}
				callback(results);
			});
		}

		function addToInstructorSchedule(callback) {
			connection.query(`INSERT INTO InstructorSchedule
			VALUES('${dateTimeSlot}', '${instructorEmail}', '${facilityName}')`, (err, results, fields) => {
				if (err) {
					response.send(err);
				}
				callback(results);
			});
		}

		function addToStudentBooking(callback) {
			connection.query(`INSERT INTO Bookings
			VALUES('${dateTimeSlot}', '${request.session.email}', '${bookingRef}', '${planeCallSign}', '${instructorEmail}')`, (err, results, fields) => {
				if (err) {
					response.send(err);
				}
				callback(results);
			});
		}

		checkTimeSlot(
			function (res) {
				if (res.length > 0) {
					response.send("You already have a booking at this time!");
				}
				else {
					bookingRef = Math.floor(Math.random() * 90000) + 10000;
					addToPlaneSchedule(
						function (res) {
							addToInstructorSchedule(
								function (res) {
									addToStudentBooking(
										function (res) {
											content += `<h1 class="text-center">Booking created</h1>
													<a class="text-center" href="/bookings">View Your Bookings</a>`
											response.send(content);
										}
									)
								}
							)
						}
					)
				}
			}
		)

	}
	else {
		response.send('Please login to view this page!');
	}
})

app.get('/bookings', function (request, response) {
	if (request.session.loggedin) {

		function getBookings(callback) {
			connection.query(`SELECT *
			FROM Bookings
			WHERE studentEmail = "${request.session.email}"`, (err, results, fields) => {
				callback(results);
			});
		}

		content = `<head>
		<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous">
			<style>
			</style>
		</head>
		<body>
			<h1 class="text-center">Western Aviation Plane Booking System</h1>
			<h2 class="text-center">Your Bookings</h2><br>
			<table class="table">
			<thead>
				<tr>
				<th scope="col">Date Timeslot</th>
				<th scope="col">Ref#</th>
				<th scope="col">Plane Call Sign</th>
				<th scope="col">Instructor Name</th>
				<th scope="col">Facility Name</th>
				<th scope="col">Review/Delete</th>
				</tr>
			</thead>
			<tbody>`;

		getBookings(
			function (res) {
				if (res.length > 0) {

					for (let i = 0; i < res.length; i++) {
						facilityName = "";
						instructorName = "";
						connection.query(`SELECT facilityName
										FROM PLANES
										WHERE planeCallSign ="${res[i].planeCallSign}"`, (err, results, fields) => {
							for (s of results) {
								facilityName = s.facilityName;
								connection.query(`SELECT fName, lName
								FROM Instructor
								WHERE instructorEmail="${res[i].instructorEmail}"`, (err, result, fields) => {
									for (t of result) {
										instructorName = t.fName + " " + t.lName;
										printRow(res[i].dateTimeSlot, res[i].referenceNumber, res[i].planeCallSign, facilityName, instructorName, res[i].instructorEmail);
										if (i + 1 == res.length) {
											returnToUser();
										}
									}
								});
							}
						});

					}
				}
				else {
					response.send("You have no bookings");
				}
			}
		)

		function returnToUser() {
			response.send(content);
		}


		function printRow(dateTimeSlot, referenceNumber, planeCallSign, facilityName, instructorName, instructorEmail) {
			content += `
			<tr>
			<td>${dateTimeSlot}</td>
			<td>${referenceNumber}</td>
			<td>${planeCallSign}</td>
			<td>${instructorName}</td>
			<td>${facilityName}</td>`;

			var dateTime = new Date(Date.parse(dateTimeSlot));

			let d = new Date();
			let currTime = d.getTime();

			var y = dateTime.getFullYear();
			var m = dateTime.getMonth() + 1;
			var day = dateTime.getDate();
			var h = dateTime.getHours();
			var mm = dateTime.getMinutes();
			var s = dateTime.getSeconds();
			dateTimeSlot = y + "-" + m + "-" + day + " " + h + ":" + mm + ":" + s;

			if (currTime < dateTime) {
				content += `
				<td>
				<form action="/delete-book" method="post">
					<input type="hidden" name="dateTimeSlot" value="${dateTimeSlot}">
					<input type="hidden" name="studentEmail" value="${request.session.email}">
					<input type="hidden" name="instructorEmail" value="${instructorEmail}">
					<input type="hidden" name="planeCallSign" value="${planeCallSign}">
					<button class="btn btn-secondary float-right" type="submit" name="submit">Delete</button>
				</form>
				<td>`;
			}
			else if (currTime > dateTime) {
				content += `
				<td>
				<form action="/review-book" method="post">
					<input type="hidden" name="studentEmail" value="${request.session.email}">
					<input type="hidden" name="instructorEmail" value="${instructorEmail}">
					<input type="hidden" name="instructorName" value="${instructorName}">
					<input type="hidden" name="planeCallSign" value="${planeCallSign}">
					<button class="btn btn-secondary float-right" type="submit" name="submit">Review</button>
				</form>
				<td>`;
			}
		}
	}
	else {
		response.send('Please login to view this page!');
	}
})

app.post('/delete-book', function (request, response) {
	if (request.session.loggedin) {
		dateTimeSlot = request.body.dateTimeSlot;
		studentEmail = request.session.email;
		instructorEmail = request.body.instructorEmail;
		planeCallSign = request.body.planeCallSign;

		let content = '';

		function deleteFromBooking(callback) {
			connection.query(`DELETE
			FROM Bookings
			WHERE dateTimeSlot = "${dateTimeSlot}" AND studentEmail = "${studentEmail}"`, (err, results, fields) => {
				if (err) {
					console.log(err);
				}
				callback(results);
			});
		}

		function deleteFromInsSchedule(callback) {
			connection.query(`DELETE
			FROM InstructorSchedule
			WHERE dateTimeSlot = "${dateTimeSlot}" AND instructorEmail = "${instructorEmail}"`, (err, results, fields) => {
				if (err) {
					console.log(err);
				}
				callback(results);
			});
		}

		function deleteFromPlaneSchedule(callback) {
			connection.query(`DELETE
			FROM PlaneSchedule
			WHERE dateTimeSlot = "${dateTimeSlot}" AND planeCallSign = "${planeCallSign}"`, (err, results, fields) => {
				if (err) {
					console.log(err);
				}
				callback(results);
			});
		}

		deleteFromBooking(
			function (res) {
				deleteFromInsSchedule(
					function (res) {
						deleteFromPlaneSchedule(
							function (res) {
								content += `<h1 class="text-center">Booking Deleted</h1>
											<a class="text-center" href="/bookings">View Your Bookings</a>`
								response.send(content);
							}
						)
					}
				)
			}
		)
	} else {
		response.send('Please login to view this page!');
	}
})

app.post('/review-book', function (request, response) {
	if (request.session.loggedin) {
		studentEmail = request.session.email;
		instructorEmail = request.body.instructorEmail;
		instructorName = request.body.instructorName;
		planeCallSign = request.body.planeCallSign;

		content = `<head>
		<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous">

		</head>
		<body>
			<h1 class="text-center">Western Aviation Plane Booking System</h1><br>
			<div class="container">
				<div class="row">
					<div class="col text-center border">
						<h3>Write a Review</h3><br>
						<form action="/add-review" name="add-review" method="post">
						<p> Select Review Target:</p>
						<input type="radio" id="${planeCallSign}" name="target" value="${planeCallSign}" required>
						<label for="${planeCallSign}">${planeCallSign}</label><br>
						<input type="radio" id="${instructorEmail}" name="target" value="${instructorEmail}">
						<label for="${instructorEmail}">${instructorName}</label><br>
						<br>
						<p>Rating:</p>
						<input type="radio" id="star1" name="rating" value="1" required>
						<label for="star1">1 Star</label>
						<input type="radio" id="star2" name="rating" value="2">
						<label for="star2">2 Star</label>
						<input type="radio" id="star3" name="rating" value="3">
						<label for="star3">3 Star</label>
						<input type="radio" id="star4" name="rating" value="4">
						<label for="star4">4 Star</label>
						<input type="radio" id="star5" name="rating" value="5">
						<label for="star5">5 Star</label><br>

						<p>Comment:</p>
						<textarea cols="80" rows="4" id="comment" name="comment" maxlength="200" required></textarea><br>
						<button class="btn btn-secondary" type="submit" name="submit">Add Review</button>
						</form>
						`;
		response.send(content);
	} else {
		response.send('Please login to view this page!');
	}
});

app.post('/add-review', function (request, response) {
	if (request.session.loggedin) {
		studentEmail = request.session.email;
		target = request.body.target;
		rating = request.body.rating;
		comment = request.body.comment;

		var dateTime = new Date();
		var y = dateTime.getFullYear();
		var m = dateTime.getMonth() + 1;
		var day = dateTime.getDate();
		var h = dateTime.getHours();
		var mm = dateTime.getMinutes();
		var s = dateTime.getSeconds();
		dateTime = y + "-" + m + "-" + day + " " + h + ":" + mm + ":" + s;

		function addToPlaneReview(callback) {
			connection.query(`INSERT INTO PlaneReview
			VALUES('${dateTime}',"${studentEmail}","${rating}","${comment}","${planeCallSign}")`, (err, results, fields) => {
				callback(results);
			})
		}

		function addToInsReview(callback) {
			connection.query(`INSERT INTO InstructorReview
			VALUES('${dateTime}',"${studentEmail}","${rating}","${comment}","${instructorEmail}")`, (err, results, fields) => {
				callback(results);
			})
		}

		if (target.length > 6) {
			addToInsReview(
				function (res) {
					response.redirect('/reviews');
				}
			)
		}
		else {
			addToPlaneReview(
				function (res) {
					response.redirect('/reviews');
				}
			)
		}
	} else {
		response.send('Please login to view this page!');
	}
});

app.get('/reviews', function (request, response) {
	if (request.session.loggedin) {
		let sortBy = request.query.sortBy;
		let show = request.query.show;

		function getReviewsByDate(callback) {
			connection.query(`SELECT dateTimePosted, rating, reviewComment, p.planeCallSign as target, planeBrand, engineType, facilityName
			from planes p
		RIGHT JOIN planeReview ps on p.planeCallSign = ps.planeCallSign
		UNION
		SELECT dateTimePosted, rating, reviewComment, CONCAT(i.fName," ", i.lName) as target, null, null, null
			FROM Instructor i
		RIGHT JOIN InstructorReview ins on i.instructorEmail = ins.instructorEmail
			ORDER BY dateTimePosted DESC`, (err, results, fields) => {
				callback(results);
			});
		}

		function getReviewsByRating(callback) {
			connection.query(`SELECT dateTimePosted, rating, reviewComment, p.planeCallSign as target, planeBrand, engineType, facilityName
				from planes p
			RIGHT JOIN planeReview ps on p.planeCallSign = ps.planeCallSign
			UNION
			SELECT dateTimePosted, rating, reviewComment, CONCAT(i.fName," ", i.lName) as target, null, null, null
				FROM Instructor i
			RIGHT JOIN InstructorReview ins on i.instructorEmail = ins.instructorEmail
			ORDER BY rating DESC`, (err, results, fields) => {
				callback(results);
			});
		}
		content = `<head>
		<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous">
			<style>
			</style>
		</head>
		<body>
			<h1 class="text-center">Western Aviation Plane Booking System</h1>
			<h2 class="text-center">Reviews</h2><br>
			<div class="text-center">
				<a class="text-center"href="/reviews">Sort by date</a>-
				<a class="text-center" href="/reviews?sortBy=rating">Sort by rating</a>-
				<a class="text-center" href="/reviews?show=planes">Show Planes only by date</a>-  
				<a class="text-center" href="/reviews?show=planes&sortBy=rating">Show Planes only by rating</a>-  
				<a class="text-center" href="/reviews?show=ins">Show Instructors only by date</a>- 
				<a class="text-center" href="/reviews?show=ins&sortBy=rating">Show Instructors only by rating</a>-  
			</div>
			<div class="container">`
			;
		if (sortBy == "rating") {
			getReviewsByRating(
				function (res) {
					for (r of res) {
						if (show == null) {
							if (r.planeBrand == null) {
								content+=`
								<div class=row>
								<div class="col border w-80">
								<br>
								<h4 style="float: left;">${r.target} - Rating: ${r.rating} stars</h4><br><br>
								<h5 style="float: left;">Comment: ${r.reviewComment}</h5><br><br>
								<h6 style="float: left;">Posted: ${r.dateTimePosted}</h6>
								<br>
								</div>
								</div>`;
							}
							else {
								planeString = r.planeBrand + " " + r.target + " " + r.engineType.toUpperCase() + "-ENGINE Rating: " + r.rating + " stars";
								content+=`
								<div class=row>
								<div class="col border w-80">
								<br>
								<h4 style="float: left;">${planeString}</h4><br><br>
								<h5 style="float: left;">Facility: ${r.facilityName}</h5><br><br>
								<h5 style="float: left;">Comment: ${r.reviewComment}</h5><br><br>
								<h6 style="float: left;">Posted: ${r.dateTimePosted}</h6>
								<br>
								</div>
								</div>`;
								
							}
						}
						else if (show == "ins") {
							if (r.planeBrand == null) {
								content+=`
								<div class=row>
								<div class="col border w-80">
								<br>
								<h4 style="float: left;">${r.target} - Rating: ${r.rating} stars</h4><br><br>
								<h5 style="float: left;">Comment: ${r.reviewComment}</h5><br><br>
								<h6 style="float: left;">Posted: ${r.dateTimePosted}</h6>
								<br>
								</div>
								</div>`;
							}
						}
						else {
							if(r.planeBrand != null) {
								planeString = r.planeBrand + " " + r.target + " " + r.engineType.toUpperCase() + "-ENGINE Rating: " + r.rating + " stars";
								content+=`
								<div class=row>
								<div class="col border w-80">
								<br>
								<h4 style="float: left;">${planeString}</h4><br><br>
								<h5 style="float: left;">Facility: ${r.facilityName}</h5><br><br>
								<h5 style="float: left;">Comment: ${r.reviewComment}</h5><br><br>
								<h6 style="float: left;">Posted: ${r.dateTimePosted}</h6>
								<br>
								</div>
								</div>`;
							}
						}
					}
					response.send(content);
				}
			)
		}
		else {
			getReviewsByDate(
				function (res) {
					for (r of res) {
						if (show == null) {
							if (r.planeBrand == null) {
								content+=`
								<div class=row>
								<div class="col border w-80">
								<br>
								<h4 style="float: left;">${r.target} - Rating: ${r.rating} stars</h4><br><br>
								<h5 style="float: left;">Comment: ${r.reviewComment}</h5><br><br>
								<h6 style="float: left;">Posted: ${r.dateTimePosted}</h6>
								<br>
								</div>
								</div>`;
							}
							else {
								planeString = r.planeBrand + " " + r.target + " " + r.engineType.toUpperCase() + "-ENGINE Rating: " + r.rating + " stars";
								content+=`
								<div class=row>
								<div class="col border w-80">
								<br>
								<h4 style="float: left;">${planeString}</h4><br><br>
								<h5 style="float: left;">Facility: ${r.facilityName}</h5><br><br>
								<h5 style="float: left;">Comment: ${r.reviewComment}</h5><br><br>
								<h6 style="float: left;">Posted: ${r.dateTimePosted}</h6>
								<br>
								</div>
								</div>`;
								
							}
						}
						else if (show == "ins") {
							if (r.planeBrand == null) {
								content+=`
								<div class=row>
								<div class="col border w-80">
								<br>
								<h4 style="float: left;">${r.target} - Rating: ${r.rating} stars</h4><br><br>
								<h5 style="float: left;">Comment: ${r.reviewComment}</h5><br><br>
								<h6 style="float: left;">Posted: ${r.dateTimePosted}</h6>
								<br>
								</div>
								</div>`;
							}
						}
						else {
							if(r.planeBrand != null) {
								planeString = r.planeBrand + " " + r.target + " " + r.engineType.toUpperCase() + "-ENGINE Rating: " + r.rating + " stars";
								content+=`
								<div class=row>
								<div class="col border w-80">
								<br>
								<h4 style="float: left;">${planeString}</h4><br><br>
								<h5 style="float: left;">Facility: ${r.facilityName}</h5><br><br>
								<h5 style="float: left;">Comment: ${r.reviewComment}</h5><br><br>
								<h6 style="float: left;">Posted: ${r.dateTimePosted}</h6>
								<br>
								</div>
								</div>`;
							}
						}
					}
					response.send(content);
				}
			)
		}

	} else {
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