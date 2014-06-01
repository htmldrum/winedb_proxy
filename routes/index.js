var express         = require('express');
var router          = express.Router();
var redis           = require( 'redis' );
var conn            = redis.createClient(); // TODO: Provide each thread with sepparate connection
var REDIS_HASH_KEY  = 'paths';
var REMOTE_HOSTNAME = 'http://dchan.devstable.newdev.mshanken.com';
var unirest         = require( 'unirest' );

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

}

// One method handles all requests
router.get( '*', function( req, res ){

  var path = req.path.toString();

  // Fetch the path
  fetch_cached_path( path, function( err, cached_content ){

    console.log( cached_content );
    console.log( err );

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

  console.log( 'path', path );

  conn.hget( REDIS_HASH_KEY, path, function( err, val ){

    console.log( 'fetch_cached_path' );
    console.log( '-----------------' );
    console.log( 'val', val );
    console.log( 'err', err );

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

        conn.hset( [ REDIS_HASH_KEY, path, serialized_cache ], function(){

          next( err, serialized_cache );

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

function proxy_path( path, next ){
  request_path.call( this, path, next, false );
}
function cache_path( path, next ){
  request_path.call( this, path, next, true );
}

/*
* proxy_path - Proxies the request to the host, returns result
* @param path { String } - Path to remote request
* @callback
*   @param { object } err
*   @param { results } res
*/

function proxy_path( path, callback ){

  var err, res;

  if( can_cache( req.path ) ){

    res = "Content fetched from Redis";
    err = null;

  }

  callback( res );

}

constructor();

module.exports = router;
