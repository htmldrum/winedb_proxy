var redis                 = require( 'redis' );
var conn                  = redis.createClient();
var async                 = require( 'async' );
var CONCURRENCY_LIMIT     = 2;
var REDIS_HASH_KEY        = 'paths';
var REDIS_VALIDATOR_KEY   = 'expires';
var REMOTE_HOSTNAME       = 'http://dchan.devstable.newdev.mshanken.com';
var TTL                   = 10 * 60 * 60; // every 10 minutes

module.exports = function invalidator(){

  setInterval( function(){

    conn.hkeys( [ REDIS_HASH_KEY ], function( err, rows ){

      if( rows.length ){

        var q = async.queue( function( row, next ){

          conn.hdel( [ REDIS_HASH_KEY, row ], function( err, res ){

            if( err ){

              throw 'Redis Error: ' + err;

            } else {

              console.log( 'cache cleared: ' + row );
              next();

            }

          });

        }, CONCURRENCY_LIMIT );

        q.push( rows );

      }
    
    });
  
  }, TTL );
  
};
