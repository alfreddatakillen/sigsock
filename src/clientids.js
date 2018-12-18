const crypto = require('crypto');

function generate(namespace) {
	const hash0 = crypto.createHash('sha256');
	hash0.update(
		'' + Math.random() + process.pid + Math.random() + namespace
	);
	hash0.update(process.pid + '');
	hash0.update(Math.random() + '')
	hash0.update(process.cwd());
	hash0.update(Math.random() + '')
	hash0.update(namespace);
	hash0.update(Math.random() + '')
	const userid = hash0.digest('base64').replace(/[^a-zA-Z0-9]/g, '').substr(0, 8);
	const hash1 = crypto.createHash('sha256');
	hash1.update(userid);
	hash1.update(namespace);
	const a = userid + (hash1.digest('base64').replace(/[^a-zA-Z0-9]/g, '').substr(0, 8));
	return a;
}

function validate(cid, namespace) {
	if (cid.length < 10) return false;
	const checksum = cid.substr(-8);
	const userid = cid.substr(0, cid.length - 8);
	const hash = crypto.createHash('sha256');
	hash.update(userid);
	hash.update(namespace);
	return hash.digest('base64').replace(/[^a-zA-Z0-9]/g, '').substr(0, 8) === checksum;
}

module.exports = { generate, validate };
