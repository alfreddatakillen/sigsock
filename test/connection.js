const clientids = require('../src/clientids');
const connection = require('../src/connection');
const EventEmitter = require('events');
const expect = require('chai').expect;

describe('connection', () => {

	describe('cleanup()', () => {

		it('should delete old disconnected clients', () => {

			return new Promise((resolve, reject) => {

				const namespace = '/flow';
				const sockets = [];

				for (let i = 0; i < 1100; i++) {
					const socket = new EventEmitter();
					sockets.push(socket);
					connection(socket, namespace);
					if (i === 1099) {
						socket.on('cid', () => {
							const socket = new EventEmitter();
							connection(socket, namespace);
							socket.on('cleaned', nr => {
								resolve(nr);
							});
							setTimeout(() => socket.emit('cleanup'), 1500);
						});
					}
					socket.emit('whoami');
					socket.emit('disconnect');
				}

			})
			.then(cleaned => {
				expect(cleaned).to.be.above(20);
			});

		});

	});

	it('should return a valid cid on whoami', () => {

		return new Promise((resolve, reject) => {

			const socket = new EventEmitter();
			connection(socket, '/namespace');
			socket.on('cid', cid => {
				resolve(cid);
			});
			socket.emit('whoami');


		})
			.then(cid => {
				const valid = clientids.validate(cid, '/namespace');
				expect(valid).to.equal(true);
			});

	});

	it('should return a valid cid if I try to set an invalid one', () => {

		return new Promise((resolve, reject) => {

			const socket = new EventEmitter();
			connection(socket, '/namespace');
			socket.on('cid', cid => {
				resolve(cid);
			});
			socket.emit('iam', 'invalidcidjao');


		})
			.then(cid => {
				const valid = clientids.validate(cid, '/namespace');
				expect(valid).to.equal(true);
			});

	});

	it('should return the old cid if i try to change to a new one', () => {
		const socket = new EventEmitter();
		return new Promise((resolve, reject) => {
			connection(socket, '/namespace');
			socket.once('cid', cid => {
				resolve(cid);
			});
			socket.emit('whoami');
		})
			.then(oldcid => {

				return new Promise((resolve, reject) => {
					const newcid = 'wtfthiscidissooooinvalid';

					socket.once('cid', cid => {
						resolve(cid);
					});

					socket.emit('iam', newcid);
				})
					.then(cid => {
						expect(cid).to.equal(oldcid);
					});

			});
	});

	it('should keep the cid i set if the server had not cid from before', () => {
		return new Promise((resolve, reject) => {
			const socket = new EventEmitter();
			connection(socket, '/namespace');
			socket.once('cid', cid => {
				resolve(cid);
			});
			socket.emit('whoami');
		})
			.then(validcid => {

				// Create a new connection:

				return new Promise((resolve, reject) => {

					const socket = new EventEmitter();
					connection(socket, '/namespace');
					socket.once('cid', cid => {
						resolve([ validcid, cid ]);
					});
					socket.emit('iam', validcid);
					socket.emit('whoami');

				});
			})
			.then(([ validcid, cid ]) => {
				expect(cid).to.equal(validcid);
			});
	});

});
