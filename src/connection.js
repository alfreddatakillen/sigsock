const clientids = require('./clientids');

const lastseen = {};
const rooms = {};
const sockets = {};

let lastCleanup = 0;

function cleanUp() {
	lastCleanup = new Date().getTime();
	const oldLastseenLen = Object.keys(lastseen).length;
	const keep = 1000; // Keep the last 1000 connected.
	const disconnectedClients = Object.keys(lastseen)
		.filter(cid => typeof sockets[cid] === 'undefined');
	if (disconnectedClients.length <= keep) return 0;
	const timestamps = disconnectedClients.map(cid => lastseen[cid]).sort();
	const oldest = timestamps[timestamps.length - keep];
	Object.keys(lastseen).forEach(cid => {
		if (lastseen[cid] < oldest) delete lastseen[cid];
	});
	const lastseenLen = Object.keys(lastseen).length;
	return oldLastseenLen - lastseenLen;
}

function connection(socket, namespace) {

	let cid;

	function assureCid() {
		if (!cid) {
			cid = clientids.generate(namespace);
			socket._sigsock_cid = cid;
			lastseen[cid] = new Date().getTime();
			sockets[cid] = socket;
			socket.emit('cid', cid);
		}
		setLastseen();
		if (new Date().getTime() - lastCleanup > 1000 * 60 * 10) {
			// If more than 10 minutes since last cleanUp...
			cleanUp();
		}
	}

	function listRooms() {
		socket.emit('rooms',
			Object.keys(rooms).filter(
				room => rooms[room].indexOf(cid) !== -1
			).sort().map(room => '#' + room)
		);
	}

	function sendmsg(msgType, destination, ...msg) {
		if (destination.substr(0, 1) === '#') {
			const room = destination.substr(1);
			if (!rooms[room]) return;
			rooms[room].forEach(c => {

				if (!sockets[c]) return;
				if (msgType === 'msg') {
					if (c === cid) return;
					sockets[c].emit(msgType, destination, cid, ...msg);
				} else {
					sockets[c].emit(msgType, destination, ...msg);
				}

			});
		} else {
			if (clientids.validate(destination, namespace)) {
				if (sockets[destination]) {
					sockets[destination].emit(msgType, cid, ...msg);
				}
			}
		}
	}

	let lastLastseen = 0;
	function setLastseen() {
		let timestamp = new Date().getTime();
		if (timestamp <= lastLastseen) timestamp = lastLastseen + 1;
		lastLastseen = timestamp;
		lastseen[cid] = timestamp;
	}

	socket.on('cleanup', () => {
		const result = cleanUp();
		socket.emit('cleaned', result);
	});

	socket.on('iam', c => {
		if (cid) {
			if (c !== cid) socket.emit('cid', cid);
			setLastseen();
			return;
		}
		if (!clientids.validate(c, namespace)) return assureCid();
		if (!sockets[c]) {
			cid = c;
			socket._sigsock_cid = cid;
			sockets[cid] = socket;
			socket.emit('cid', cid);
		} else {
			const oldSocket = sockets[c];
			cid = c;
			socket._sigsock_cid = cid;
			sockets[cid] = socket;
			oldSocket.emit('takeover');
			socket.emit('cid', cid);
			if (oldSocket.disconnect) {
				setTimeout(() => oldSocket.disconnect(), 1000);
			}
		}
		setLastseen();
	});

	socket.on('disconnect', reason => {
		if (!cid) return;
		setLastseen();
		if (sockets[cid] && sockets[cid]._sigsock_cid === cid) {
			delete sockets[cid];
		}
	});

	socket.on('join', room => {
		if (room.substr(0, 1) === '#') room = room.substr(1);
		assureCid();
		if (typeof rooms[room] === 'undefined') rooms[room] = [];
		if (rooms[room].indexOf(cid) === -1) {
			sendmsg('members', '#' + room, '+' + cid);
			rooms[room].push(cid);
			socket.emit('members', '#' + room, [...(rooms[room])].sort());
		}
		listRooms();
	});

	socket.on('part', room => {
		if (room.substr(0, 1) === '#') room = room.substr(1);
		assureCid();
		if (typeof rooms[room] === 'undefined') return listRooms();
		rooms[room] = rooms[room].filter(c => c !== cid);
		if (rooms[room].length === 0) delete rooms[room];
		if (rooms[room]) {
			sendmsg('members', '#' + room, '-' + cid);
		}
		listRooms();
	});

	socket.on('sendmsg', (destination, ...message) => {
		assureCid();
		sendmsg('msg', destination, ...message);
	});

	socket.on('whoami', () => {
		if (cid) {
			socket.emit('cid', cid);
			setLastseen();
			return;
		}
		assureCid();
	});
}

module.exports = connection;
