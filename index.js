const express = require('express');
const session = require('express-session')
const path = require('path')

const app = express();
const newConnection = require('./DBConnections');
app.use(express.static('static'));

app.use(session({
    secret: 'Keep it secret'
    , name: 'uniqueSessionID'
    , saveUninitialized: false
}))

app.get('/', (req, res) => {
    if (req.session.loggedIn)
        res.redirect('/dashboard')
    else
        res.sendFile('asdf.html', { root: path.join(__dirname, 'static') })
})
app.get('/dashboard', (req, res) => {
    if (req.session.loggedIn) {
        res.setHeader('Content-Type', 'text/html')
        res.write('Welcome ' + req.session.username + ' to your dashboard')
        res.write('<a href="/logout">Logout</a>')
        res.end()
    }
    else
        res.redirect('/login')
})
app.get('/login', (req, res) => {
    res.sendFile('asdf.html', { root: path.join(__dirname, 'static') })
})
app.post('/authenticate'
    , (req, res, next) => {
        // Actual implementation would check values in a database
        if (req.body.username == 'foo' && req.body.password == 'bar') {
            res.locals.username = req.body.username
            next()
        }
        else
            res.sendStatus(401)
    }
    , (req, res) => {
        req.session.loggedIn = true
        req.session.username = res.locals.username
        console.log(req.session)
        res.redirect('/dashboard')
    })
app.get('/logout', (req, res) => {
    req.session.destroy((err) => { })
    res.send('Thank you! Visit again')
})

app.listen(80);

