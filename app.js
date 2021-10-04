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

//create unique namespace that opens with '/' and has 6 digits 1-9
const namespaces = io.of(/^\/[0-9]{6}$/);
//terminal logs connection with socket.io when established
namespaces.on('connection', function(socket) {
  const namespace = socket.nsp;
  socket.broadcast.emit('connected peer');

//Browser sends a signal with data to the namespace
socket.on('signal', function(signal) {
  socket.broadcast.emit('signal', signal);
})

//Namespace emits disconnected peer
socket.on('disconnect', function() {
  namespace.emit('disconnected peer');
})

});

module.exports = { app, io };
