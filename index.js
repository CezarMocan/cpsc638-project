// set variables for environment
var express = require('express');
var app = express();
var path = require('path');
var bodyParser  = require('body-parser');

// views as directory for all template files
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade'); // use either jade or ejs       
// instruct express to server up static assets
app.use(express.static(__dirname + '/public'));

// Set server port
app.set('port', (process.env.PORT || 5000));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});

var pg = require('pg');
var dbService = require('./DBOperations.js');

app.get('/', function(req, res) {
  res.render('index');
});

app.get('/submit', function(req, res) {
	res.render('submit');
});

app.post('/submitPost', function (request, response) {  
  var link = request.body.link;  
  var tags = request.body.tags;  

  console.log(request);
  console.log(link);

  if (isNullOrUndefined(link))
    response.send(dbService.DEFAULT_ERROR_MSG);
  if (isNullOrUndefined(tags))
    tags = [];

  dbService.addTextmoji(link, tags, function(result) {
    response.send(result);
  });
})

function areNullOrUndefined(objs) {
  for (var i = 0; i < objs.length; i++)
    if (isNullOrUndefined(objs[i]))
      return true;
  return false;
}

function isNullOrUndefined(obj) {  
  if (obj === null || obj === undefined)
    return true;
  return false;
}
