require('dotenv').config();
var fs = require('fs');
var request = require('request');
var PushBullet = require('pushbullet');

var lastMsg = 0;
var currentMsg;

const pusher = new PushBullet(process.env.key);
var stream = pusher.stream();

stream.connect();

stream.on('connect', function() {
	console.log("Connected");
});

stream.on('nop', function(message) {
    console.log("status : connected");
});

stream.on('tickle', function(message) {
  fs.readFile("./assets/data.txt", function (err, buf) {
    lastMsg = buf.toString();
    console.log("last = " + lastMsg);
  });
  
  var options = {
    url: ' https://api.pushbullet.com/v2/pushes?active=true&modified_after=' + lastMsg,
    method: 'GET',
    headers: {
      'Access-Token': process.env.key,
    },
    json: true
  };
  
  request(options, function (error, response, body) {
  
    currentMsg = body['pushes'][0]['modified'];
    var currentText = body['pushes'][0]['body'];
    console.log("current = " + currentMsg);
  
    if (currentMsg > lastMsg) {
  
      fs.writeFile("./assets/data.txt", currentMsg, (err) => {
        if (err) console.log(err);
        console.log("MSG: " + currentText);
        console.log("Successfully Written to File.");
      });
    } else {
      console.log("--Already Updated--");
    }
  
  
  
  
  })
});

