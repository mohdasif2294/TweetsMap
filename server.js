// To use HTTP Server and Client
http = require('http');
//Needed for creating Web Server
express = require('express');
//Referncing Node-Twitter
var twitter = require('twitter');
//Creating express App
var app = express();
//Server Setup
var server = http.createServer(app);
//WebSocket Module for Communication
var io = require('socket.io').listen(server);

//Use the default port or default to 8081 locally
server.listen(process.env.PORT || 8081);

//Setup Node-Twitter (twitter Stream API Wrapper)
var twit = new twitter({
	consumer_key: 'EQqSoEf7SpY3oL0cVg4zNYgpL',
	consumer_secret: '7z6s0YD1QAohKRyA2h46SCwtyBQN4FuAuLG6NmrDyVGCiJNRmy',
	access_token_key: '3034933350-LFGtlABnaLYlwU3pj5Mhbb0IUpjl1Mxk8VQOJyb',
	access_token_secret: 'cGP4qS1w0rML8o6sG90ApwTivHemzZVgYRwr1d1VKYdvR'
}),
stream = null;

console.log("Server Initiation........");

//Setup routing for app
app.use(express.static(__dirname + '/public'));
var count=0;
//Create web sockets connection.
io.sockets.on('connection', function (socket) {

  //On Connection with Client
	socket.on("Send tweets", function() {

		if(stream === null) {
      //Calling Twitter Stream Api after set interval. 
      //Reason: Twitter Stream API stops providing data after some time because of rate limiting.
			setInterval(function(){

        twit_stream();
      },86000);

      //To remove lag of one set Interval initially.
      twit_stream();

      //Most Important: Function to Interact with Twitter stream API and Process Data
      function twit_stream(){
        console.log("Connecting to Twitter Stream API...........");
        
        //Connect to twitter stream passing in filter for entire world.
        twit.stream('statuses/filter', {'locations':'-180,-90,180,90'}, function(stream) {
        
        //On recieving Data
        stream.on('data', function(data) {
              // Checking whether JSON result have coordinates
              if (data.coordinates){
                
                if (data.coordinates !== null){
                  //If so then build json with coordinates and send out to web sockets
                  var outputPoint = {"lng": data.coordinates.coordinates[0],"lat": data.coordinates.coordinates[1]};
                  count+=1;
                  console.log("Count:",count,"Location: ",outputPoint);

                  //Broadcasting to all the channels
                  socket.broadcast.emit("twitter-stream", outputPoint);
                  //Send out to web sockets channel.
                  socket.emit('twitter-stream', outputPoint);
                }
                
                //If Tweet is about some place
                else if(data.place){
                 
                  if(data.place.bounding_box === 'Polygon'){
                    // Calculate the center of the bounding box for the tweet
                    var coord, _i, _len;
                    var centerLat = 0;
                    var centerLng = 0;

                    for (_i = 0, _len = coords.length; _i < _len; _i++) {
                      coord = coords[_i];
                      centerLat += coord[1];
                      centerLng += coord[0];
                    }
                    centerLat = centerLat / coords.length;
                    centerLng = centerLng / coords.length;

                    var outputPoint = {"lng": centerLng,"lat": centerLat};

                    console.log("Location: ",outputPoint);

                    socket.emit('twitter-stream', outputPoint);
                    socket.broadcast.emit("twitter-stream", outputPoint);
                  }
                }
              }

              //On exceeding rate limit 
              stream.on('limit', function(limitMessage) {
                return console.log(limitMessage);
              });

              //On warning
              stream.on('warning', function(warning) {
                return console.log(warning);
              });

              //On disconnect
              stream.on('disconnect', function(disconnectMessage) {
                return console.log(disconnectMessage);
                io.emit('user disconnected');
              });
            }); 
          //Adding Listeners limit
          stream.setMaxListeners(800);
        });}
      }
    });
  // Emits signal to the client when they are connected and they can start receiving Tweets
  socket.emit("connected");
});

