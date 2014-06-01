var express               = require('express');
var router                = express.Router();
var redis                 = require( 'redis' );
var conn                  = redis.createClient(); // TODO: Provide each thread with sepparate connection
var REDIS_HASH_KEY        = 'paths';
var REDIS_VALIDATOR_KEY   = 'expires';
var REMOTE_HOSTNAME       = 'http://dchan.devstable.newdev.mshanken.com';
var unirest               = require( 'unirest' );
var invalidator           = require( './invalidator' );

// Init
function constructor(){

  // Handle errors
  conn.on( 'error', function( err ){

    throw 'Redis Error: ' + err;

  });

  // Prepping schema
  conn.del( REDIS_HASH_KEY );
  conn.hset( [REDIS_HASH_KEY, '/wine', JSON.stringify(
    { 
      "item" : 
        { 
          "wine_name" : "james_test",
          "age" : 26 
        }
    } )], redis.print );
  conn.hset( [REDIS_HASH_KEY, '/wine/2', JSON.stringify(
    { 
      "item" : 
        { 
          "wine_name" : "james_test_2",
          "age" : 52 
        }
    } )], redis.print );

  // Setting invalidator
  invalidator();

}

// One method handles all requests
router.get( '*', function( req, res ){

  var path = req.path.toString();

  // Fetch the path
  fetch_cached_path( path, function( err, cached_content ){

    if( !err && cached_content !== null ){

      console.log( 'cache hit' );

      res.json( JSON.parse( cached_content ) );

    } else if( !err ) {

      console.log( 'cache miss' );
      
      if( can_cache( path ) ){

        cache_path( path, function( err, resp ){

          res.json( JSON.parse( resp ) );
        
        } );

      } else {

        proxy_path( path, function( resp ){

          res.json( JSON.parse( resp ) );
        
        } );

      }

    } else {

      throw 'Redis Error: ' + err;

    }

  });

});


function can_cache( path ){
  // Look up table with what are the dynamic
  // and non-dynamic routes
  return true;
}

/*
* fetch_cached_path - Returns the cached content
* @param path { String } - Path to remote request
* @param next { Function } - Callback
* @returns cache { String | Undefined } - Content cached
*/

function fetch_cached_path( path, next ){

  conn.hget( REDIS_HASH_KEY, path, function( err, val ){

    next( err, val );
    
  });
  
}

/*
* request_path
* @param path { String } - Path to remote request
* @callback
*   @param { object } err
*   @param { results } res
*/

function request_path( path, next, do_cache ){

  var err, res;

  if( can_cache( path ) ){

    unirest.get( REMOTE_HOSTNAME + path )
    .headers({ 'Accept' : 'application/json' })
    .end( function( resp ){

      var serialized_cache = resp.raw_body;

      if( do_cache ){

        // Update cache
        conn.hset( [ REDIS_HASH_KEY, path, serialized_cache ], function(){

          // Update
          conn.zadd( REDIS_VALIDATOR_KEY, path, Date.now(), function( err, response ){

            next( err, serialized_cache );
          
          });

        });

      } else {

        next( err, serialized_cache );

      }

    });

  } else {

    err = {
      code : 401,
      message : 'Not Authorized to cache this path'
    };

    callback( err, res );

  }

}

/*
* proxy_path - Proxies the request to the host, returns result
* @param path { String } - Path to remote request
* @callback
*   @param { object } err
*   @param { results } res
*/
function proxy_path( path, next ){
  request_path.call( this, path, next, false );
}
function cache_path( path, next ){
  request_path.call( this, path, next, true );
}


constructor();

module.exports = router;
