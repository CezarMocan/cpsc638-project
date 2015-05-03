var pg = require('pg');

var DEFAULT_ERROR_MSG = "ERROR";
var DEFAULT_SUCCESS_MSG = "SUCCESS";

exports.DEFAULT_ERROR_MSG = DEFAULT_ERROR_MSG;
exports.DEFAULT_SUCCESS_MSG = DEFAULT_SUCCESS_MSG;


exports.getTable = function(callbackFun, table) {
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT * FROM ' + table, function(err, result) {
      done();
      if (err) { 
        console.error(err); 
        callbackFun("Error " + err);
      }
      else
       callbackFun(result.rows);
    });
  });  
}

function getTimestamp() {
	return Math.floor(new Date() / 1000);
}

function getDay() {
	return Math.floor(getTimestamp() / 60 / 60 / 24);
}

function actuallyUpvote(user, link, count, callbackFun) {
  var timestamp = getTimestamp();
  // Day since epoch
  var day = getDay();
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT usage_count FROM link_submission WHERE link_id=($1)', [link], function(err, result) {
      if (err) { 
        done();
        console.error(err); 
        callbackFun(DEFAULT_ERROR_MSG); 
      } else {
      	console.log('Result rows: ' + result.rows + ' ' + result.rows.length);
        if (result.rows.length == 0) {
          callbackFun(DEFAULT_ERROR_MSG);
        } else {
	        console.log('Result rows[0]: ' + result.rows[0]);

	        var newCount = parseInt(result.rows[0].usage_count) + parseInt(count); 
	        client.query('UPDATE link_submission SET usage_count=($1) WHERE link_id=($2)', [newCount, link], function(err, result) {          
	          if (err) {
	            done();
	            console.error(err); 
	            callbackFun(DEFAULT_ERROR_MSG);
	          } else {
	            client.query('SELECT daily_count FROM link_trending WHERE link_id = ($1) AND day = ($2)', [link, day], function(err, result) {          
	              if (err) { 
	                done();
	                console.error(err); 
	                callbackFun(DEFAULT_ERROR_MSG); 
	              }
	              else { 
	                if (result.rows.length == 0) {
	                  // New entry in table
	                  client.query('INSERT INTO link_trending VALUES ($1, $2, $3)', [link, day, count], function(err, result) {
	                    done();
	                    if (err) {
	                    	console.error("Insert into link_trending " + err);
	                    	callbackFun(DEFAULT_ERROR_MSG);
	                    }
	                    else callbackFun(DEFAULT_SUCCESS_MSG);
	                  });
	                } else {
	                  var newDailyCount = parseInt(result.rows[0].daily_count) + parseInt(count);
	                  // Update old entry in table
	                  client.query('UPDATE link_trending SET daily_count=($1) WHERE link_id=($2) AND day=($3)', [newDailyCount, link, day], function(err, result) {
	                    done();
	                    if (err) {
	                    	console.error("Update link_trending " + err);
	                    	callbackFun(DEFAULT_ERROR_MSG);
	                    }
	                    else callbackFun(DEFAULT_SUCCESS_MSG);
	                  });
	                }
	              }
	            });
	          }
        	});
				}
      }
    });
  });
}

function upvote(user, link, count, callbackFun) {
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
	client.query('SELECT user_id FROM user_upvotes WHERE user_id=($1) AND link_id=($2)', [user, link], function(err, result) {		
		if (err) {			
			done();
			console.error(err);
			callbackFun(DEFAULT_ERROR_MSG);
		} else {
			console.log(result.rows);
			if (result.rows.length == 0) {
				client.query('INSERT INTO user_upvotes VALUES ($1, $2)', [user, link], function(err, result) {
					done();
					if (err) {
						callbackFun(DEFAULT_ERROR_MSG);
					} else {
						actuallyUpvote(user, link, count, callbackFun);
					}
				})
			} else {
				callbackFun("duplicate");
			}
		}
	});
  });
}

function addUser(user, pass, callbackFun) {
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('INSERT INTO users VALUES($1, $2)', [user, pass], function(err, result) {      
    	done();
      if (err) {         
        console.error(err); 
        callbackFun(DEFAULT_ERROR_MSG); 
      } else {      	
        callbackFun('Great success!');
      }
    });
  });  	
}

function checkUser(user, pass, callbackFun) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		console.log(user);
		console.log(pass);
		client.query('SELECT user_id FROM users WHERE user_id=($1) AND pass=($2)', [user, pass], function(err, result) {
			done();
			console.log(result.rows);
			if (err) {				
				callbackFun(DEFAULT_ERROR_MSG);
			} else if (result.rows.length == 0) {
				callbackFun("fail");
			} else {
				callbackFun(result.rows);
			}
		});
	});
}

function addLinkTags(link, tags, callbackFun) {
	// Build query string
	var queryString = 'INSERT INTO link_tag VALUES ';
	for (var i = 0; i < tags.length; i++) {
		if (i != 0) { 
			queryString += ', ';
		}
		queryString += '(';
		queryString = queryString + '\'' + link + '\', \'' + tags[i] + '\')';
	}
	
	// Make insert query
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query(queryString, [], function(err, result) {  
    	done();
    	if (err) {
    		console.error(err);
    		callbackFun(DEFAULT_ERROR_MSG);
    	} else {
    		callbackFun('Great success! ' + link);
    	}
    });
  });    

}

function addLink(link, tags, callbackFun) {
	var timestamp = getTimestamp();
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('INSERT INTO link_submission VALUES($1, $2, $3)', [link, 0, timestamp], function(err, result) {      
    	done();
      if (err) {         
        console.error(err); 
        callbackFun(DEFAULT_ERROR_MSG); 
      } else {
      	addLinkTags(link, tags, callbackFun);
        //callbackFun('Great success! ' + link);
      }
    });
  });  	
}

function getTopLinksNoTag(resultsLimit, callbackFun) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		client.query('SELECT link_id, usage_count, creation_date FROM link_submission ORDER BY usage_count DESC LIMIT ($1)', [resultsLimit], function(err, result) {
			done();
			if (err) {
				console.error(err);
				callbackFun(DEFAULT_ERROR_MSG);
			} else {
				callbackFun(result.rows);
			}
		});
	});
}

function getTopLinksWithTag(resultsLimit, tag, callbackFun) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		client.query('SELECT link_tag.link_id, tag, usage_count, creation_date FROM link_submission, link_tag WHERE link_submission.link_id = link_tag.link_id AND tag=($1) ORDER BY usage_count DESC LIMIT ($2)', [tag, resultsLimit], function(err, result) {
			done();
			if (err) {
				console.error(err);
				callbackFun(DEFAULT_ERROR_MSG);
			} else {
				callbackFun(result.rows);
			}
		});
	});
}

function getTrendingLinksNoTag(resultsLimit, callbackFun) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		client.query('SELECT link_id, score FROM link_trending_scores ORDER BY score DESC LIMIT ($1)', [resultsLimit], function(err, result) {
			done();
			if (err) {
				console.error(err);
				callbackFun(DEFAULT_ERROR_MSG);
			} else {
				callbackFun(result.rows);
			}
		});
	});
}

function getTrendingLinksWithTag(resultsLimit, tag, callbackFun) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {		
		client.query('SELECT link_tag.link_id, tag, score FROM link_trending_scores, link_tag WHERE link_trending_scores.link_id = link_tag.link_id AND tag=($1) ORDER BY score DESC LIMIT ($2)', [tag, resultsLimit], function(err, result) {
			done();
			if (err) {
				console.error(err);
				callbackFun(DEFAULT_ERROR_MSG);
			} else {
				callbackFun(result.rows);
			}
		});
	});
}

function getNewLinksNoTag(createdAfter, resultsLimit, callbackFun) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		console.log("Created after: " + createdAfter);
		client.query('SELECT link_id, usage_count, creation_date FROM link_submission ORDER BY creation_date DESC LIMIT ($1)', [resultsLimit], function(err, result) {
			done();
			if (err) {
				console.error(err);
				callbackFun(DEFAULT_ERROR_MSG);
			} else {
				callbackFun(result.rows);
			}
		});
	});
}

function getNewLinksWithTag(createdAfter, resultsLimit, tag, callbackFun) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		client.query('SELECT link_tag.link_id, tag, usage_count, creation_date FROM link_submission, link_tag WHERE link_submission.link_id = link_tag.link_id AND tag=($1) ORDER BY creation_date DESC LIMIT ($2)', [category, resultsLimit], function(err, result) {		
			done();
			if (err) {
				console.error(err);
				callbackFun(DEFAULT_ERROR_MSG);
			} else {
				callbackFun(result.rows);
			}
		});
	});
}


exports.addUser = addUser;
exports.checkUser = checkUser;
exports.getTimestamp = getTimestamp;
exports.addLink = addLink;
exports.getTopLinksNoTag = getTopLinksNoTag;
exports.getTopLinksWithTag = getTopLinksWithTag;
exports.getTrendingLinksNoTag = getTrendingLinksNoTag;
exports.getTrendingLinksWithTag = getTrendingLinksWithTag;
exports.getNewLinksNoTag = getNewLinksNoTag;
exports.getNewLinksWithTag = getNewLinksWithTag;
exports.upvote = upvote;

