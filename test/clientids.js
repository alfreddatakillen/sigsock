const clientids = require('../src/clientids');
const expect = require('chai').expect;

describe('clientids', () => {

	describe('generate()', () => {

		it('should resolve with a string', () => {
			expect(clientids.generate('/namespace')).to.be.a('string');
		});

	});

	describe('validate()', () => {
		it('should return true on valid cid', () => {
			const cid = clientids.generate('/namespace');
			const valid = clientids.validate(cid, '/namespace');
			expect(valid).to.equal(true);
		});

		it('should return false on invalid cid', () => {
			const valid = clientids.validate('nothisisnotavalidcid', '/namespace');
			expect(valid).to.equal(false);
		});

		it('should not validate cids for a different namespace', () => {
			const cid = clientids.generate('/namespaceA')
			const valid = clientids.validate(cid, '/namespaceB');
			expect(valid).to.equal(false);
		});

	});

	

});
