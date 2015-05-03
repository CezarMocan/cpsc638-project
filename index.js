// set variables for environment
var express = require('express');
var app = express();
var path = require('path');
var bodyParser  = require('body-parser');

var NEW_LINKS_PERIOD_SECONDS = 2 * 60 * 60; // 2 hours

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
  res.redirect('/top');
});

app.get('/submit', function(req, res) {
	res.render('submit');
});

app.post('/submitPost', function (request, response) {  
  var link = request.body.link;  
  var tags = request.body.tags;  

  if (link.indexOf("http://") != 0 && link.indexOf("https://") != 0)
    link = "http://" + link;

  if (isNullOrUndefined(link))
    response.send(dbService.DEFAULT_ERROR_MSG);
  if (isNullOrUndefined(tags))
    tags = [];

  dbService.addTextmoji(link, tags, function(result) {
    response.redirect('new');
  });
})

app.get('/top', function (request, response) {
  var tag = request.query.tag;
  var resultsLimit = 100;

  if (isNullOrUndefined(tag)) {
    dbService.getTopLinksNoTag(resultsLimit, function(result) {
      console.log(result);
      response.render('ranking', {'ranking': result, 'pageTitle': 'Top links', 'pageDescription': 'All-time top voted links'});
    });
  } else {
    dbService.getTopLinksWithTag(resultsLimit, tag, function(result) {
      console.log(result);
      response.render('ranking', {'ranking': result, 'pageTitle': 'Top links', 'pageDescription': 'All-time top voted links'});
    });
  }
})

app.get('/new', function (request, response) {
  var tag = request.query.tag;
  var resultsLimit = 100;
  var createdAfter = (parseInt(dbService.getTimestamp()) - parseInt(NEW_LINKS_PERIOD_SECONDS));

  if (isNullOrUndefined(tag)) {
    dbService.getNewLinksNoTag(createdAfter, resultsLimit, function(result) {
      console.log(result);
      response.render('ranking', {'ranking': result, 'pageTitle': 'New links', 'pageDescription': 'Most recently submitted links'});
    });
  } else {
    dbService.getNewLinksWithTag(createdAfter, resultsLimit, tag, function(result) {
      console.log(result);
      response.render('ranking', {'ranking': result, 'pageTitle': 'New links', 'pageDescription': 'Most recently submitted links'});
    });
  }
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
