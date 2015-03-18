var express = require('express'); 
var https = require('https'); 
var http = require('http'); 
var fs = require('fs'); 
var url = require('url'); 
var bodyParser = require('body-parser');
var basicAuth = require('basic-auth-connect'); 

/*
* Setup auth, midware, and options then create http and https
*/
var auth = basicAuth( function(user, pass) { 
	return ((user ==='cs360') && (pass === 'test')); 
});

var app = express(); 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ 
	extended: true 
}));

var options = { 
	host: '127.0.0.1', 
	key: fs.readFileSync('ssl/server.key'), 
	cert: fs.readFileSync('ssl/server.crt') 
}; 

http.createServer(app).listen(80); 
https.createServer(options, app).listen(443); 

/*
* Below are different services of the server
*/
// Index page
app.get('/', function (req, res) { 
	res.send("Get Index"); 
});

// Static page
app.use('/', express.static('./html', {maxAge: 60*60*1000}));


// get city suggestions function
app.get('/getcity', function (req, res) { 

	var urlObj = url.parse(req.url, true, false);
	var jsonresult = [];

	fs.readFile('cities.dat.txt', function (err, data) { 

		if(err) throw err; 

		var cities = data.toString().split("\n");
		var myRe = new RegExp("^" + urlObj.query["q"]); 

		for(var i = 0; i < cities.length; i++) { 

			var result = cities[i].search(myRe); 
			if(result != -1) { 
				jsonresult.push({city:cities[i]});
			}
		}

		if (urlObj.query["q"].length > 0){

			res.writeHead(200); 
			res.end(JSON.stringify(jsonresult));
		} else {

			res.writeHead(200); 
			res.end();
		}
	});
});

// Get comments service
app.get('/comment', function (req, res) { 

	// Read all of the database entries and return them in a JSON array 
	var MongoClient = require('mongodb').MongoClient; 

	MongoClient.connect("mongodb://localhost/weather", function(err, db) {

		if(err) throw err; 

		db.collection("comments", function(err, comments) { 

			if(err) throw err; 

			comments.find( function(err, items){ 

				items.toArray( function(err, itemArr){ 

					res.json(itemArr);
				}); 
			}); 
		}); 
	});
}); 

// Post comments service
app.post('/comment', auth, function (req, res) { 

	var MongoClient = require('mongodb').MongoClient;

	// Now put it into the database 
	MongoClient.connect("mongodb://localhost/weather", function(err, db) { 

		if(err) throw err; 

		// Show authentication console
		req.remoteUser;

		db.collection('comments').insert(req.body, function(err, records) { 

			if(err) throw err;

			//console.log("Record added as " + records[0]._id); 

			res.writeHead(200); 
			res.end("");
		}); 
	});
});