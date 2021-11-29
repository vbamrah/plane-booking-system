const express = require('express');
const app = express();
//const newConnection = require('./DBConnection');
app.use(express.static('static'));


app.listen(80);

