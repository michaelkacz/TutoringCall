const cookieParser = require('cookie-parser');
const express = require('express');
const io = require('socket.io')();
const path = require('path');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

//terminal logs connection with socket.io when established
io.on('connection', function(socket) {
  console.log('Connection to socket.io server');
});

module.exports = { app, io };
