var pg = require('pg');

var weight = [10, 8, 7, 5, 4, 3, 2];

function getTimestamp() {
	return Math.floor(new Date() / 1000);
}

function getHour() {
	return Math.floor(getTimestamp() / 60 / 60);
}

function removeOldEntries(callbackFun) {
	var hour = getHour();
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('DELETE FROM link_trending WHERE hour<($1)', [hour - 6], function(err, result) {    	
    	done();
    	if (err) {
    		console.error("Error deleting week old entries from link_trending where " + err);
    	} else {
    		callbackFun();
    	}
    });  	
  });	
}

function emptyTrendingScoresTable(callbackFun) {
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('DELETE FROM link_trending_scores', function(err, result) {    	
    	if (err) {
    		console.error('Error in deleting data from table link_trending_scores ' + err);
    		done();
    	} else {
    		console.log('Successfully deleted data from table link_trending_scores');
    		client.query('INSERT INTO link_trending_scores (link_id, score) SELECT DISTINCT link_id, 0 FROM link_trending', function(err, result) {
    			done();
    			if (err) {
    				console.error("Error in moving unique links from link_trending to link_trending_scores");
    				return;
    			} else {
    				callbackFun();
    			}
    		});
    	}
    });
	});
}

function recomputeTrendingScoresTable(thisHour, currHour, stopHour) {
	if (currHour === stopHour)
		return;	

	console.log(weight[thisHour - currHour]);

  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
  	client.query('UPDATE link_trending_scores SET score=score+(i.hourly_count*($1))' + 
  									'FROM (SELECT link_id, hourly_count FROM link_trending WHERE day=($2)) i ' + 
  										'WHERE i.link_id = link_trending_scores.link_id', [weight[thisHour - currHour], currHour], function(err, result) {
  		done();
  		if (err) {
  			console.error("Error moving all ze crepe to the trending_scores table" + err);
  		} else {
  			recomputeTrendingScoresTable(thisHour, currHour - 1, stopHour);
  		}
  	});
  });
}

var thisHour = getHour();
var currHour = thisHour;
var stopHour = currHour - 7;

removeOldEntries(function() {
	emptyTrendingScoresTable(function() {
		recomputeTrendingScoresTable(thisHour, currHour, stopHour)
	});
});
