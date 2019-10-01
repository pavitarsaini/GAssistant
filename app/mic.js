'use strict';

const record = require('node-record-lpcm16');
const Speaker = require('speaker');
const path = require('path');
const GoogleAssistant = require('../node_modules/google-assistant/index');
const speakerHelper = require('../node_modules/google-assistant/examples/speaker-helper');
var fs = require('fs');

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
      sampleRateOut: 24000, // supported are 16000 / 24000 (defaults to 24000)
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
    .on('transcription', data => console.log('Transcription:', data.transcription, ' --- Done:', data.done))
    // what the assistant said back
    .on('response', text => console.log('Assistant Text Response:', text))

    // if we've requested a volume level change, get the percentage of the new level
    .on('volume-percent', percent => console.log('New Volume Percent:', percent))
    // the device needs to complete an action
    .on('device-action', action => console.log('Device Action:', action))
    // once the conversation is ended, see if we need to follow up

    
    .on('screen-data', (screen) => {

      var buf = screen.data.toString();

      fs.writeFile("data.html", buf, (err) => {
        if (err) console.log(err);
        console.log("Successfully Written to File.");
      });

      //console.log('SCREEN DATA:', buf);

    })

    .on('ended', (error, continueConversation) => {
      if (error) console.log('Conversation Ended Error:', error);
      else if (continueConversation) openMicAgain = true;
      else console.log('Conversation Complete');
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
    .on('close', () => {
      console.log('Assistant Finished Speaking');
      if (openMicAgain) assistant.start(config.conversation);
    });
};

// setup the assistant
const assistant = new GoogleAssistant(config.auth);
assistant
  .on('ready', () => {
    // start a conversation!
    assistant.start(config.conversation);
  })
  .on('started', startConversation)
  .on('error', (error) => {
    console.log('Assistant Error:', error);
  });
