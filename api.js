
// call the required packages
var express = require('express');
var bodyparser = require('body-parser');
var http = require('http')
var routes = require('./routes')

// initialize express app
var app = express();

// setup bodyparser
app.use(bodyparser.urlencoded({extended: true}));
app.use(bodyparser.json());

// initialize service port
var port = process.env.PORT || 9090;

// initialize router
var router = express.Router();

// routes
router.post('/new_survey', routes.new_survey);
router.get('/open_survey', routes.open_survey);
router.post('/submit_result', routes.submit_result);
router.post('/view_results', routes.view_results);
router.post('/share_results', routes.share_results);

// register routes
app.use('/', router);

// start server
app.listen(port);

console.log("Server running on port " + port);