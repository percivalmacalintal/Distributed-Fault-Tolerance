require('dotenv').config();
const cookieParser = require('cookie-parser');
const express = require('express')
const path = require('path')

const { attachUser, requireAuth } = require('./auth');
const routes = require('./routes');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cookieParser());
app.use(attachUser);

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
});

app.use('/', routes);

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(`GUI node running on port ${port}`);
});