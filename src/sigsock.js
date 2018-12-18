const connection = require('./connection');

function sigsock(io, namespace) {
	io.of(namespace).on('connection', socket => connection(socket, namespace));
}

module.exports = sigsock;
