
// call required modules
var blockchain = require("./chain");
var utils = require("./utils");

// researcher creates a new survey questionaire
var new_survey = function(req, res) {

	// parse body to get request data
	var survey_name = req.body.survey_name;
	var questions_data = req.body.questions_data;

	var address = "";
	var keys = utils.get_keypair();

	// generate new address on the blockchain
	blockchain.create_address()
	
	// grant necessary permissions to this address
	.then(function(addr) {
		address = addr;
		return blockchain.grant_permissions(addr, ["create"]);
	})
	
	// create the survey on the blockchain
	.then(function(grant_txnid) {
		return blockchain.create_survey(address, survey_name);
	})

	// repackage and write the survey questions and the password for encyption to the blockchain
	.then(function(){
		var survey_data = {researcher_pubkey: keys.public, survey_name: survey_name, survey_questions: questions_data};
		var hex_data = utils.encode_data(survey_data);

		// var symmetric_key = utils.get_symmetric();
		// var password = utils.encrypt_password(keys.public, symmetric_key);

		// return blockchain.publish_questions(address, survey_name, hex_data, survey_name+"_pwd", password);
		return blockchain.publish_questions(address, survey_name, hex_data);
	})

	// return the results
	.then(function(txnid) {
		var response = {"survey_id": survey_name, "researcher_address": address, "researcher_pubkey":keys.public, "researcher_privkey": keys.private}
		// console.log(txnid)

		res.send({"okay":true, "message": response});

	}, function(error) {
		res.send({"okay":false, "message": error.toString()});
	})

	// end the promise chain
	.done();
}

// participants open a survey to view questions saved on the blockchain database
var open_survey = function(req, res) {
	
	// retrieve the survey id from the get request
	var survey_id = req.query.survey_id;

	// check if the survey exists
	blockchain.survey_exists(survey_id)

	// retrieve the survey questions
	.then(function(exist) {
		return blockchain.retrieve_data(survey_id, "questions");
	})

	// TODO: retrieve the block time also, just to act as timestamp for when the questions was published
	// decode and return survey questions
	.then(function(data) {
		var decoded_data = utils.decode_data(data[0]);
		res.send({"okay":true, "message": decoded_data});
	
	}, function(error) {
		res.send({"okay":false, "message": error.toString()});
	})

	// end the promise chain
	.done();

}

// participants submit results of the survey to the blockchain database
var  submit_result = function(req, res) {
	
	// parse body to get request data
	var survey_id = req.body.survey_id;
	var answers_data = req.body.answers_data;
	var researcher_address = req.body.researcher_address;
	var researcher_pubkey = req.body.researcher_pubkey

	// check if survey exists
	blockchain.survey_exists(survey_id)

	// generate new address on the blockchain
	.then(function(exist) {
		if (exist == false) {
			res.send({"okay":false, "message": "Survey does not exist"});
			return;
		}

		return blockchain.create_address()
	})

	// TODO: verify consent and grant write permissions
	// grant necessary permissions to this address
	.then(function(address) {
		addr = address;
		return blockchain.grant_permissions(address, ["send"]);
	})

	// repackage and write the survey answers to the blockchain
	.then(function(address){

		var symmetric_key = utils.get_symmetric();
		// console.log(symmetric_key);
		var password = utils.encrypt_password(researcher_pubkey, symmetric_key);
		var response = utils.encrypt_data(answers_data, symmetric_key);

		var data = {survey_id: survey_id, survey_answers: response};
		var pass = {"address": address, "secret": password};

		// var data = {survey_id: survey_id, survey_answers: response, survey_password: password};
		var hex_data = utils.encode_data(data);
		var hex_password = utils.encode_data(pass)


		return blockchain.publish_answers(address, survey_id,  hex_data, hex_password, researcher_address)
	})

	// return the results
	.then(function(address) {
		res.send({"okay":true, "message": address});

	}, function(error) {
		res.send({"okay":false, "message": error.toString()});
	})

	// end the promise chain
	.done();
}

// researcher views the response of all the participants
var view_results = function(req, res) {
	
	// retrieve the survey id from the get request
	var survey_id = req.body.survey_id;
	var private_key = req.body.key;
	var researcher_address = req.body.researcher_address;
	var gl_answers;

	// check if the survey exists
	blockchain.survey_exists(survey_id)

	// retrieve the answers of the survey
	.then(function(exists) {
		return blockchain.retrieve_data(survey_id, "answers");
	})

	// retrieve the passwords of the survey
	.then(function(answers) {
		gl_answers = answers
		return blockchain.retrieve_data(survey_id+"_pwd", researcher_address)	
	})

	.then(function(passwords) {
		//TODO: handle error when nothing is returned ... that is the researcher tries to view results without password
		var decrypted_responses = [];
		for (i in gl_answers) {
 	
 			// decode answer
			var decoded_answer =  utils.decode_data(gl_answers[i]);

			// decode password
			var decoded_password = utils.decode_data(passwords[i]);

			// decrypt password with private key			
			var password = decoded_password.secret;
			var decr_password = utils.decrypt_password(private_key, password);
			// console.log(decr_password);
			//TODO: introduce mechanism to verify the address,instead of relying on the timestamped order
			//TODO: Handle error when the private key is wrong
			// decrypt answers with password		
			var response = decoded_answer.survey_answers;
			decrypted_responses[i] = utils.decrypt_data(response, decr_password);

		}
		res.send({"okay":true, "message": decrypted_responses});	
	
	}, function(error) {
		res.send({"okay":false, "message": error.toString()});
	})

	// end the promise chain
	.done();
}

// researcher request the results of a survey
var request_results = function(req, res) {
		//TODO: simply make a request transactions
}

// researcher share the response of all the participants
var share_results = function(req, res) {
	var survey_id = req.body.survey_id;		
	var researcher_key = req.body.researcher_privkey;
	var researcher_address = req.body.researcher_address;
	var requester_key = req.body.requester_pubkey;
	var requester_address = req.body.requester_address;	

	// check if the survey exists
	blockchain.survey_exists(survey_id)

	//TODO: check if the requester already have access

	// retrieve the passwords of the survey
	.then(function(exists) {
		return blockchain.retrieve_data(survey_id+"_pwd", researcher_address);
	})

	// retrieve the passwords of the survey
	.then(function(passwords) {

		var n = passwords.length;

		for (let i=n-1; i>=0; i--) {
			// decode password
			var decoded_password = utils.decode_data(passwords[i]);

			// decrypt password with private key			
			var password = decoded_password.secret;

			var symmetric_key = utils.decrypt_password(researcher_key, password);
			// console.log(symmetric_key);
			// encrypt password with new public key		
			var password = utils.encrypt_password(requester_key, symmetric_key);
			var pass = {"address": requester_address, "secret": password};

			// encode password
			var hex_password = utils.encode_data(pass)

			blockchain.publish_data(researcher_address, requester_address, survey_id+"_pwd",  hex_password);

		}
		res.send({"okay":true, "message": requester_address});	
	
	}, function(error) {
		res.send({"okay":false, "message": error.toString()});
	})

	// end the promise chain
	.done();
}

module.exports = {
	new_survey,
	view_results,
	open_survey,
	share_results,
	submit_result
}