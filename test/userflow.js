const connection = require('../src/connection');
const EventEmitter = require('events');
const expect = require('chai').expect;

const log = [];
class SockMock extends EventEmitter {
	constructor(name) {
		super();
		this.logname = name;
	}
	cemit(...args) {
		log.push(this.logname + '> ' + args.map(arg => Array.isArray(arg) ? '[' + arg.join(',') + ']' : arg).join(' '));
		super.emit(...args);
	}
	emit(...args) {
		log.push(this.logname + '< ' + args.map(arg => Array.isArray(arg) ? '[' + arg.join(',') + ']' : arg).join(' '));
		super.emit(...args);
	}
}

describe('Flow', () => {

	const namespace = '/flow';
	const socketA = new SockMock('A');
	const socketB = new SockMock('B');
	const socketC = new SockMock('C');
	const socketD = new SockMock('C');
	const socketE = new SockMock('C');

	beforeEach(() => log.length = 0);

	it('create session A', () => {
		return new Promise((resolve, reject) => {
			connection(socketA, namespace);
			socketA.cemit('whoami');
			setTimeout(resolve, 100);
		})
		.then(() => {
			expect(log).to.deep.equal([
				'A> whoami',
				'A< cid ' + socketA._sigsock_cid
			]);
		});
	});

	it('create session B', () => {
		return new Promise((resolve, reject) => {
			connection(socketB, namespace);
			socketB.cemit('whoami');
			setTimeout(resolve, 100);
		})
		.then(() => {
			expect(log).to.deep.equal([
				'B> whoami',
				'B< cid ' + socketB._sigsock_cid
			]);
		});
	});

	it('create session C', () => {
		return new Promise((resolve, reject) => {
			connection(socketC, namespace);
			socketC.cemit('whoami');
			setTimeout(resolve, 100);
		})
		.then(() => {
			expect(log).to.deep.equal([
				'C> whoami',
				'C< cid ' + socketC._sigsock_cid
			]);
		});
	});

	it('Session A joins rooms', () => {
		return new Promise((resolve, reject) => {
			socketA.cemit('join', '#dummy');
			socketA.cemit('join', '#testing');
			setTimeout(resolve, 100);
		})
		.then(() => {
			expect(log).to.deep.equal([
				'A> join #dummy',
				'A< members #dummy [' + socketA._sigsock_cid + ']',
				'A< rooms [#dummy]',
				'A> join #testing',
				'A< members #testing [' + socketA._sigsock_cid + ']',
				'A< rooms [#dummy,#testing]'
			]);
		});
	});

	it('Session B joins rooms', () => {
		return new Promise((resolve, reject) => {
			socketB.cemit('join', '#testing');
			socketB.cemit('join', '#dummy');
			setTimeout(resolve, 100);
		})
		.then(() => {
			expect(log).to.deep.equal([
				'B> join #testing',
				'A< members #testing +' + socketB._sigsock_cid,
				'B< members #testing [' + [socketA._sigsock_cid, socketB._sigsock_cid].sort().join(',') + ']',
				'B< rooms [#testing]',
				'B> join #dummy',
				'A< members #dummy +' + socketB._sigsock_cid,
				'B< members #dummy [' + [socketA._sigsock_cid, socketB._sigsock_cid].sort().join(',') + ']',
				'B< rooms [#dummy,#testing]'
			]);
		});
	});

	it('Session A leaves room', () => {
		return new Promise((resolve, reject) => {
			socketA.cemit('part', '#testing');
			setTimeout(resolve, 100);
		})
		.then(() => {
			expect(log).to.deep.equal([
				'A> part #testing',
				'B< members #testing -' + socketA._sigsock_cid,
				'A< rooms [#dummy]'
			]);
		});
	});


	it('Session C joins room', () => {
		return new Promise((resolve, reject) => {
			socketC.cemit('join', '#dummy');
			setTimeout(resolve, 100);
		})
		.then(() => {
			expect(log).to.deep.equal([
				'C> join #dummy',
				'A< members #dummy +' + socketC._sigsock_cid,
				'B< members #dummy +' + socketC._sigsock_cid,
				'C< members #dummy [' + [socketA._sigsock_cid, socketB._sigsock_cid, socketC._sigsock_cid].sort().join(',') + ']',
				'C< rooms [#dummy]'
			]);
		});
	});
	
	it('Session C sends message to room', () => {
		return new Promise((resolve, reject) => {
			socketC.cemit('sendmsg', '#dummy', 'hello world');
			setTimeout(resolve, 100);
		})
		.then(() => {
			expect(log).to.deep.equal([
				'C> sendmsg #dummy hello world',
				'A< msg #dummy ' + socketC._sigsock_cid + ' hello world',
				'B< msg #dummy ' + socketC._sigsock_cid + ' hello world'
			]);
		});
	});

	it('Session C leaves room', () => {
		return new Promise((resolve, reject) => {
			socketC.cemit('part', '#dummy');
			setTimeout(resolve, 100);
		})
		.then(() => {
			expect(log).to.deep.equal([
				'C> part #dummy',
				'A< members #dummy -' + socketC._sigsock_cid,
				'B< members #dummy -' + socketC._sigsock_cid,
				'C< rooms []'
			]);
		});
	});

	it('Session A sends message to session B', () => {
		return new Promise((resolve, reject) => {
			socketA.cemit('sendmsg', socketB._sigsock_cid, 'r u there?');
			setTimeout(resolve, 100);
		})
		.then(() => {
			expect(log).to.deep.equal([
				'A> sendmsg ' + socketB._sigsock_cid + ' r u there?',
				'B< msg ' + socketA._sigsock_cid + ' r u there?'
			]);
		});
	});

});
