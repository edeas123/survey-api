
// call the required packages
var multichain = require('bitcoin-promise')
var conv = require('binstring');
var keypair = require('keypair');
var Q = require('q');
var fs = require('fs');

// read this from a config file
var config = {};
var conf = fs.readFileSync('config.txt', 'utf8').split('\r\n');

// initialize multichain client for json-rpc connection to the blockchain node
for (i in conf) {
	tmp = conf[i].split('=');
	config[tmp[0]] = tmp[1];
}

config['port'] = parseInt(config['port']); // the port should be an integer
var client = new multichain.Client(config);

var create_address = function() {
	var deferred = Q.defer();

	client.cmd("getnewaddress", function(err, address, res) {
		if (err) {
			console.log(err);
			deferred.reject(err);
			return;
		}
			
		deferred.resolve(address)
	});

	return deferred.promise;
}

var grant_permissions = function(address, permissions) {

	var deferred = Q.defer();
	var batch = []
	for (var i=0; i < permissions.length; i++) {
		batch.push({
			method: "grant",
			params: [address, permissions[i]]
		});
	}

	client.cmd(batch, function(err, ret, res) {
		if (err) {
			console.log(err);
			deferred.reject(err)
			return;
		}
			
		deferred.resolve(address);
	});

	return deferred.promise;
}

var create_survey = function(address, name) {
	
	var deferred = Q.defer();
	 
	client.cmd("createfrom", address, "stream", name, true, function(err, txnid, res) {
		if (err) {
			console.log(err);
			deferred.reject(err);
			return;
		}
		

		client.cmd("createfrom", address, "stream", name+"_pwd", true, function(err, txnid, res) {
			if (err) {
				console.log(err);
				deferred.reject(err);
				return;
			}
			
			deferred.resolve(txnid)
		});
	});

	return deferred.promise;
}

var publish_data = function( address, type, stream, hex_data) {
	var deferred = Q.defer();
	client.cmd("publishfrom", address, stream, type, hex_data, function(err, txnid, res) {
		if (err) {
			console.log(err);
			deferred.reject(err);
			return;
		}
			
		deferred.resolve(address)
	});	

	return deferred.promise;
}

var publish_questions = function( address, stream, hex_data) {

	var deferred = Q.defer();

	client.cmd("publishfrom", address, stream, "questions", hex_data, function(err, txnid, res) {
		if (err) {
			console.log(err);
			deferred.reject(err);
			return;
		}
			
		deferred.resolve(address)
	});	

	return deferred.promise;
}

var publish_answers = function(address, stream, hex_data, hex_password, raddr) {
	var deferred = Q.defer();

	var to_data = [{"for":stream,
	  				"key":"answers",
	  				"data":hex_data},
				{"for":stream+"_pwd",
				 "key":raddr,
				 "data":hex_password}];

	client.cmd("createrawsendfrom", address, {}, to_data, "send", function(err, txnid, res) {
		if (err) {
			console.log(err);
			deferred.reject(err);
			return;
		}
			
		deferred.resolve(address)
	});	

	return deferred.promise;
}

var retrieve_answers = function(name, address) {
	
	var deferred = Q.defer();

	client.cmd("liststreamkeyitems", name, "answers", false, function(err, ret, res) {
		if (err) {
			deferred.reject(err);
			return;
		}

		var data = [];
		for (let i in ret) {
			data[i] = ret[i]['data'];
		}
		deferred.resolve(data);
	});

	return deferred.promise;
}

var retrieve_data = function(name, type) {
	
	var deferred = Q.defer();

	client.cmd("liststreamkeyitems", name, type, false, function(err, ret, res) {
		if (err) {
			deferred.reject(err);
			return;
		}

		var data = [];
		for (let i in ret) {
			data[i] = ret[i]['data'];
		}
		deferred.resolve(data);
	});

	return deferred.promise;
}

var survey_exists = function(id) {

	var deferred = Q.defer();
	client.cmd("subscribe", [id, id+"_pwd"], function(err, ret, res) {
		if (err) {
			console.log(err);
			deferred.reject(err);
			return;
		}
		
		if (ret == null) {
			deferred.resolve(true);
		} else {
			deferred.resolve(false);
		}
	});

	return deferred.promise;
}

module.exports = {
	create_address,
	grant_permissions,
	publish_questions,
	publish_answers,
	publish_data,
	retrieve_data,
	create_survey,
	survey_exists
}