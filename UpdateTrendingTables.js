var pg = require('pg');

var weight = [10, 8, 7, 5, 4, 3, 2];

function getTimestamp() {
	return Math.floor(new Date() / 1000);
}

function getDay() {
	return Math.floor(getTimestamp() / 60 / 60 / 24);
}

function removeOldEntries(callbackFun) {
	var day = getDay();
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('DELETE FROM link_trending WHERE day<($1)', [day - 6], function(err, result) {    	
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

function recomputeTrendingScoresTable(today, currDay, stopDay) {
	if (currDay === stopDay)
		return;	

	console.log(weight[today - currDay]);

  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
  	client.query('UPDATE link_trending_scores SET score=score+(i.daily_count*($1))' + 
  									'FROM (SELECT link_id, daily_count FROM link_trending WHERE day=($2)) i ' + 
  										'WHERE i.link_id = link_trending_scores.link_id', [weight[today - currDay], currDay], function(err, result) {
  		done();
  		if (err) {
  			console.error("Error moving all ze crepe to the trending_scores table" + err);
  		} else {
  			recomputeTrendingScoresTable(today, currDay - 1, stopDay);
  		}
  	});
  });
}

var today = getDay();
var currDay = today;
var stopDay = currDay - 7;

removeOldEntries(function() {
	emptyTrendingScoresTable(function() {
		recomputeTrendingScoresTable(today, currDay, stopDay)
	});
});
