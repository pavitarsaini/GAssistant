'use strict';

const fs = require('fs')
const path = require('path')

const record = require('node-record-lpcm16');
const Speaker = require('speaker');
const GoogleAssistant = require('google-assistant/index');
const speakerHelper = require('google-assistant/examples/speaker-helper');
const replace = require('replace-in-file');

const options = {
  files: './app/data.html',
  from: '<img class="in4M3QLgQj6__icon" src="https://www.gstatic.com/actions/devices_platform/assistant_tv_logo.svg">',
  to: '',
};

const config = {
  auth: {
    keyFilePath: path.resolve(__dirname, './config/client_id.json'),
    // where you want the tokens to be saved
    // will create the directory if not already there
    savedTokensPath: path.resolve(__dirname, './config/tokens.json'),
  },
  // this param is optional, but all options will be shown
  conversation: {
    audio: {
      encodingIn: 'LINEAR16', // supported are LINEAR16 / FLAC (defaults to LINEAR16)
      sampleRateIn: 16000, // supported rates are between 16000-24000 (defaults to 16000)
      encodingOut: 'LINEAR16', // supported are LINEAR16 / MP3 / OPUS_IN_OGG (defaults to LINEAR16)
      sampleRateOut: 20000, // supported are 16000 / 24000 (defaults to 24000)
    },
    lang: 'en-US', // language code for input/output (defaults to en-US)
 // use if you've gone through the Device Registration process
    deviceLocation: {
      coordinates: { // set the latitude and longitude of the device
        latitude: 43.429755,
        longitude: -79.764255,
      },
    },
    //textQuery: 'What is the Weather?', // if this is set, audio input is ignored
    isNew: false, // set this to true if you want to force a new conversation and ignore the old state
    screen: {
      isOn: true, // set this to true if you want to output results to a screen
    },
  },
};

// setup the assistant
const assistant = new GoogleAssistant(config.auth);

const startConversation = (conversation) => {
  console.log('Say something!');
  let openMicAgain = false;

  // setup the conversation
  conversation
    // send the audio buffer to the speaker
    .on('audio-data', (data) => {
      speakerHelper.update(data);
    })
    // done speaking, close the mic
    .on('end-of-utterance', () => record.stop())
    // just to spit out to the console what was said (as we say it)
    .on('transcription', (data) => {
      console.log('Transcription:', data.transcription, ' --- Done:', data.done)
      
      document.getElementById("log-container").textContent=data.transcription;

    })
    // what the assistant said back
    .on('response', text => {
      console.log('Assistant Text Response:', text)
      //document.getElementById("logger").textContent=text;
    })

    // if we've requested a volume level change, get the percentage of the new level
    .on('volume-percent', percent => console.log('New Volume Percent:', percent))
    // the device needs to complete an action
    .on('device-action', action => console.log('Device Action:', action))
    // once the conversation is ended, see if we need to follow up

    
    .on('screen-data', (screen) => {

      var buf = screen.data.toString();

      fs.writeFile("./app/data.html", buf, (err) => {
        if (err) console.log(err);
        console.log("Successfully Written to File.");
      });

      replace(options)
      .then(results => {
        console.log('Replacement results:', results);
        var ifrm = document.getElementById("ifrm");
      ifrm.setAttribute('src', "data.html");
      })
      .catch(error => {
        console.error('Error occurred:', error);
      });      

    })

    .on('ended', (error, continueConversation) => {
        console.log('Conversation Complete');
        openMicAgain = true;
      })
    // catch any errors
    .on('error', (error) => {
      console.log('Conversation Error:', error);
    });

  // pass the mic audio to the assistant
  const mic = record.start({ threshold: 0 });
  mic.on('data', data => conversation.write(data));

  // setup the speaker
  const speaker = new Speaker({
    channels: 1,
    sampleRate: config.conversation.audio.sampleRateOut,
  });
  speakerHelper.init(speaker);
  speaker
    .on('open', () => {
      console.log('Assistant Speaking');
      speakerHelper.open();
    })
    .on('flush', () => {
      console.log('Assistant Finished Speaking');      
      
      promptForInput()
    });
};


const promptForInput = () => {
  // type what you want to ask the assistant
  
  assistant.start(config.conversation, startConversation);
  
};


assistant
.on('ready', promptForInput)
  //.on('started', startConversation)
  .on('error', (error) => {
    console.log('Assistant Error:', error);
  });