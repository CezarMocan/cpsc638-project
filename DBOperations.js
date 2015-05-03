var pg = require('pg');

var DEFAULT_ERROR_MSG = "ERROR";
var DEFAULT_SUCCESS_MSG = "SUCCESS";
// This table will be used in order to retrieve TOP & NEW
var DB_TABLE_EMOJI_SUBMISSION = "emoji_submission"
// This table will be used in order to retrieve TRENDING
var DB_TABLE_EMOJI_TRENDING = "emoji_trending"
var DB_TABLE_EMOJI_USER = "emoji_user"

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

function increaseSingleTextmojiCount(emoji, count, callbackFun) {
  var timestamp = getTimestamp();
  // Day since epoch
  var day = getDay();

  console.log("Day is " + day);
//  selectFromWhere('usage_count', 'emoji_submission', {'emoji_id': emoji}, updateEmojiSubmission, callbackFun);

  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT usage_count FROM emoji_submission WHERE emoji_id=($1)', [emoji], function(err, result) {
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
	        client.query('UPDATE emoji_submission SET usage_count=($1) WHERE emoji_id=($2)', [newCount, emoji], function(err, result) {          
	          if (err) {
	            done();
	            console.error(err); 
	            callbackFun(DEFAULT_ERROR_MSG);
	          } else {
	            client.query('SELECT daily_count FROM emoji_trending WHERE emoji_id = ($1) AND day = ($2)', [emoji, day], function(err, result) {          
	              if (err) { 
	                done();
	                console.error(err); 
	                callbackFun(DEFAULT_ERROR_MSG); 
	              }
	              else { 
	                if (result.rows.length == 0) {
	                  // New entry in table
	                  client.query('INSERT INTO emoji_trending VALUES ($1, $2, $3)', [emoji, day, count], function(err, result) {
	                    done();
	                    if (err) {
	                    	console.error("Insert into emoji_trending " + err);
	                    	callbackFun(DEFAULT_ERROR_MSG);
	                    }
	                    else callbackFun(DEFAULT_SUCCESS_MSG);
	                  });
	                } else {
	                  var newDailyCount = parseInt(result.rows[0].daily_count) + parseInt(count);
	                  // Update old entry in table
	                  client.query('UPDATE emoji_trending SET daily_count=($1) WHERE emoji_id=($2) AND day=($3)', [newDailyCount, emoji, day], function(err, result) {
	                    done();
	                    if (err) {
	                    	console.error("Update emoji_trending " + err);
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

function increaseMultipleTextmojiCount(emojiArray, callbackFun) {
  var successCount = 0; 
  var errorCount = 0;
  console.log(emojiArray);
  for (var index = 0; index < emojiArray.length; index++) {
    var emoji = emojiArray[index].emoji;
    var count = emojiArray[index].count;
    increaseSingleTextmojiCount(emoji, count, function(result) {
      if (result == DEFAULT_ERROR_MSG)  errorCount++;
      else  successCount++;
      
      if (successCount + errorCount == emojiArray.length) {
        callbackFun(JSON.stringify({success: successCount, error: errorCount}));
      }      
    });
  }  
}



function addTextmojiTags(emoji, tags, callbackFun) {
	// Build query string
	var queryString = 'INSERT INTO link_tag VALUES ';
	for (var i = 0; i < tags.length; i++) {
		if (i != 0) { 
			queryString += ', ';
		}
		queryString += '(';
		queryString = queryString + '\'' + emoji + '\', \'' + tags[i] + '\')';
	}
	
	// Make insert query
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query(queryString, [], function(err, result) {  
    	done();
    	if (err) {
    		console.error(err);
    		callbackFun(DEFAULT_ERROR_MSG);
    	} else {
    		callbackFun('Great success! ' + emoji);
    	}
    });
  });    

}

function addTextmoji(emoji, tags, callbackFun) {
	var timestamp = getTimestamp();
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('INSERT INTO link_submission VALUES($1, $2, $3)', [emoji, 0, timestamp], function(err, result) {      
    	done();
      if (err) {         
        console.error(err); 
        callbackFun(DEFAULT_ERROR_MSG); 
      } else {
      	addTextmojiTags(emoji, tags, callbackFun);
        //callbackFun('Great success! ' + emoji);
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
		client.query('SELECT link_tag.link_id, tag, usage_count, creation_date FROM link_submission, link_tag WHERE link_submission.link_id = link_tag.emoji_id AND tag=($1) ORDER BY usage_count DESC LIMIT ($2)', [tag, resultsLimit], function(err, result) {
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

function getTrendingEmojisNoTag(resultsLimit, callbackFun) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		client.query('SELECT emoji_id, score FROM emoji_trending_scores ORDER BY score DESC LIMIT ($1)', [resultsLimit], function(err, result) {
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

function getTrendingEmojisWithTag(resultsLimit, tag, callbackFun) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {		
		client.query('SELECT emoji_tag.emoji_id, tag, score FROM emoji_trending_scores, emoji_tag WHERE emoji_trending_scores.emoji_id = emoji_tag.emoji_id AND tag=($1) ORDER BY score DESC LIMIT ($2)', [tag, resultsLimit], function(err, result) {
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
		client.query('SELECT link_id, usage_count, creation_date FROM link_submission WHERE creation_date >= ($1) ORDER BY usage_count DESC LIMIT ($2)', [createdAfter, resultsLimit], function(err, result) {
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
		client.query('SELECT link_tag.link_id, tag, usage_count, creation_date FROM link_submission, link_tag WHERE link_submission.link_id = link_tag.link_id AND creation_date >= ($1) AND tag=($2) ORDER BY usage_count DESC LIMIT ($3)', [createdAfter, category, resultsLimit], function(err, result) {		
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


exports.getTimestamp = getTimestamp;
exports.addTextmoji = addTextmoji;
exports.getTopLinksNoTag = getTopLinksNoTag;
exports.getTopLinksWithTag = getTopLinksWithTag;
exports.getTrendingEmojisNoTag = getTrendingEmojisNoTag;
exports.getTrendingEmojisWithTag = getTrendingEmojisWithTag;
exports.getNewLinksNoTag = getNewLinksNoTag;
exports.getNewLinksWithTag = getNewLinksWithTag;
exports.increaseSingleTextmojiCount = increaseSingleTextmojiCount;
exports.increaseMultipleTextmojiCount = increaseMultipleTextmojiCount;

