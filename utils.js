
var conv = require('binstring');
var keypair = require('keypair');

const crypto = require('crypto');

var get_keypair = function(address) {
	return keypair()
}

var encode_data = function(data) {

	var encoded_data = Buffer.from(JSON.stringify(data)).toString('hex');
	return encoded_data;
}

var decode_data = function(data) {

	var decoded_data = JSON.parse(Buffer.from(data, 'hex').toString());
	return decoded_data;
}

var get_symmetric = function() {
	return crypto.randomBytes(32); // returns a Buffer
}

var encrypt_password = function(pubkey, symmetric_key) {
	
	encrypted_key = crypto.publicEncrypt(pubkey, symmetric_key).toString('hex'); // returns a hex string

	return encrypted_key;
}

var decrypt_password = function(privkey, symmetric_key) {

	var password = Buffer.from(symmetric_key, 'hex');
	try {
		var decrypted_key = crypto.privateDecrypt(privkey, password);
	}
	catch(err) {
		console.log("Decrypting failed");
		throw err;
	}
	
	return decrypted_key;
}

var encrypt_data = function(data, symmetric_key) {

	var data_buffer = Buffer.from(JSON.stringify(data));
	var data_cipher = crypto.createCipher("AES-256-CBC", symmetric_key);

	encrypted_data = data_cipher.update(data_buffer, "buffer", "hex");
	encrypted_data += data_cipher.final("hex");

	return encrypted_data;
}

var decrypt_data = function(data, symmetric_key) {

	// console.log(symmetric_key);
	var symmetric_key = Buffer.from(symmetric_key, 'hex');
	try {
		var data_decipher = crypto.createDecipher("AES-256-CBC", symmetric_key);

		var decrypted_data = data_decipher.update(data, 'hex', 'utf8');
		decrypted_data += data_decipher.final('utf8');

		decrypted_data = JSON.parse(decrypted_data);
	}
	catch(err) {
		console.log("Decrypting failed");
	}

	return decrypted_data;
}

module.exports = {
	get_keypair,
	encode_data,
	decode_data,
	encrypt_data,
	encrypt_password,
	decrypt_password,
	decrypt_data,
	get_symmetric
}