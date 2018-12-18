const express = require('express');
const app = express();
const sigsock = require('./src/sigsock');
server = app.listen(process.env.PORT || 80);
const io = require('socket.io')(server);
sigsock(io, '/signalling');
