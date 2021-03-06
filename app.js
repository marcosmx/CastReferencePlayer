 // constants
 var OOYALA_PLAYER_URL = "//player.ooyala.com/core/e48c9b51282d406f957c666149763424?plugins=bm";
 var SPLASH_SCREEN_SRC = "./images/ooyala-logo.png";
 var LOGO_IMAGE_SRC = "./images/ooyala-logo.png";
 var PAUSE_ICON_SRC = " ./images/pause.svg";
 var PLAY_ICON_SRC = " ./images/play.svg";
 var WATERMARK_ICON_SRC = "./images/ooyala-logo-watermark.png";
 var CHROMECAST_DEBUG_TAG = "Chromecast-debug";
 var PLAYER_DEBUG_TAG = "Player-debug";

 // set the timeouts to be 5 minutes
 var SPLASH_SCREEN_TIMEOUT_MILLIS = 5 * 60 *  1000;
 var LOADING_SCREEN_TIMEOUT_MILLIS = 5 * 60 *  1000;
 var PAUSE_STATE_TIMEOUT_MILLIS = 5 * 60 * 1000;

 window.castReceiverManager = null;
 window.castMB = null;
 window.mediaManager = null;
 window.mediaElement = null;
 window.namespace = "urn:x-cast:ooyala";

 var debug = true;
 var initialTimeout = null;
 var player = null;
 var playerId = null;
 var senders = [];
 var currentEmbedCode = null;
 var currentPlayheadTimeInfo = {};
 var duration = 0;
 var hasBeenInitialized = false;

 // Closed Captioning resources
 var ccResourceMap = {}; // Resource map of closed captions, it has format: "language" => URL
 var ccLanguage = 'en'; // currently used closed captions language, empty if none
 var isLiveStream = false; // used for closed captions on live assets

 // loading screen elements
 var promoImageElement = null;
 var titleElement = null;
 var descriptionElement = null;

 var autoPlay = false;
 var controls = null;
 var rootElement = null;
 var stopped = false;
 var ended = false;
 var stopEvent = null;
 var adsPlayed = false;
 var hasAds = false;


 // Screen related variables
 var screenController = null;
 var screens = null;
 var splashScreen = null;
 var loadingScreen = null;
 var playerScreen = null;
 var errorScreen = null;

 /*************************************************************************/
 // CHROMECAST SETUP
 /*************************************************************************/

 // Initialize Chromecast receiver application
 window.onload = function() {
   //cast.receiver.logger.setLevelValue(cast.receiver.LoggerLevel.DEBUG);
   setupMediaManager();
   setupCastReceiver();
   setupMessageBus();
   window.castReceiverManager.start();
   initUIElements();

   // Start the initial timeout set to timeout on the splash screen
   initialTimeout = setTimeout(function() {
     window.castReceiverManager.stop();
   }, SPLASH_SCREEN_TIMEOUT_MILLIS);
 }

/**
 Required initialization of cast.receiver.MediaManager
 https://developers.google.com/cast/docs/reference/receiver/cast.receiver.MediaManager
 **/
function setupMediaManager() {
  window.mediaElement = document.getElementById('tmp_video');
  window.mediaManager = new cast.receiver.MediaManager(window.mediaElement);

  window.mediaManager.onGetStatus = onGetStatus.bind(this);
  window.mediaManager.onLoad = onLoad.bind(this);
  window.mediaManager.onPauseOrig = window.mediaManager.onPause;
  window.mediaManager.onPause = onPause.bind(this);
  window.mediaManager.onPlayOrig = window.mediaManager.onPlay;
  window.mediaManager.onPlay = onPlay.bind(this);
  window.mediaManager.onSeekOrig = window.mediaManager.onSeek;
  window.mediaManager.onSeek = onSeek.bind(this);
  window.mediaManager.onSetVolumeOrig = window.mediaManager.onSetVolume;
  window.mediaManager.onSetVolume = onSetVolume.bind(this);
  window.mediaManager.onEndedOrig = window.mediaManager.onEnded;
  window.mediaManager.onEnded = onEnded.bind(this);
  window.mediaManager.onStopOrig = window.mediaManager.onStop;
  window.mediaManager.onStop = onStop.bind(this);
  window.mediaManager.onErrorOrig = window.mediaManager.onError;
  window.mediaManager.onError = onError.bind(this);
  window.mediaManager.customizedStatusCallback = customizedStatusCallback.bind(this);
  window.mediaManager.onPlayAgainOrig = window.mediaManager.onPlayAgain;
  window.mediaManager.onPlayAgain = function(e){
    console.log("Play again event: ", e);
    player.mb.publish(OO.EVENTS.REPLAY);
    window.mediaManager.onPlayAgainOrig(
      new cast.receiver.MediaManager.Event(cast.receiver.MediaManager.EventType.PLAY_AGAIN, "on play again event", e.senderId));
  }
}

/**
 For debugging purposes only, debug output of current cast.receiver.media.MediaStatus object
 **/
function customizedStatusCallback(ms) {
  ms.data = { customData: { debug: debug } }  // to make sure it will be printed with Chromecast-debug tag
  printDebugMessage("customizedStatusCallback", ms);
  return ms;
}

/**
 Response to getStatus request of sender'media object
 **/
function onGetStatus(event) {
  event.data = { customData: { debug: debug } } // to make sure it will be printed with Chromecast-debug tag
  printDebugMessage("onGetStatus", event);
  window.mediaManager.sendStatus(event.senderId, event.data.requestId, true);
}

/**
 Response to pause request of sender'media object
 **/
function onPause(event) {
  printDebugMessage("onPause", event);
  window.mediaManager.onPauseOrig(event);
  //player.mb.publish(OO.EVENTS.PAUSE);
  player.pause();
  window.mediaManager.sendStatus(event.senderId, event.data.requestId, true);
}

/**
 Response to play request of sender'media object
 **/
function onPlay(event) {
  printDebugMessage("onPlay", event);
  window.mediaManager.onPlayOrig(event);
  //player.mb.publish(OO.EVENTS.INITIAL_PLAY);
  player.play();
  window.mediaManager.sendStatus(event.senderId, event.data.requestId, true);
}

/**
 Response to seek request of sender'media object
 **/
function onSeek(event) {
  var seekTime = parseInt(event.data.currentTime);
  if (seekTime >= duration - 1) {
    seekTime = (duration > 1) ? duration - 1 : 0;
  }
  event.data.currentTime = seekTime;
  printDebugMessage("onSeek", event);
  player.mb.publish(OO.EVENTS.SEEK, seekTime);
  window.mediaManager.onSeekOrig(event);
  window.mediaManager.sendStatus(event.senderId, event.data.requestId, true);
}

/**
 Response to setVolume request of sender'media object
 **/
function onSetVolume(event) {
  printDebugMessage("onSetVolume", event);
  window.mediaManager.onSetVolumeOrig(event);
  var volume = event.data.volume.level;
  player.mb.publish(OO.EVENTS.CHANGE_VOLUME, volume);
  window.mediaManager.sendStatus(event.senderId, event.data.requestId, true);
}

/**
 Session will be stopped, show splash screen
 **/
function onStop(event) {
  stopped = true;
  stopEvent = event;
  player.mb.publish(OO.EVENTS.PLAYED);
  printDebugMessage("onStop", event);
}

/**
 Playback has finished, sender will be notified
 **/
function onEnded() {
  console.log("Entre al end del video")
  if (ended) {
    return;
  }
  ended = true;
  printDebugMessage("onEnded", null);
  window.mediaManager.onEndedOrig(event);
}

/**
 Error notification callback
 **/
function onError(errorObj) {
  printDebugMessage("onError", errorObj);
  window.mediaManager.onErrorOrig(errorObj);
  // Display on Chromecast screen this errorObj.
  // If this object is chrome.cast.Error, then it will
  // show error code and description, otherwise it wil
  // print string representation of this object
  displayCastMediaError(errorObj);
}

/**
 Response to loadMedia request from sender's cast session
 **/
function onLoad(event) {
  printDebugMessage("onLoad", event);
  stopped = false;
  stopEvent = null;
  var playerData = event.data.media.customData;
  handleLoadingScreenInfo(playerData);
  // For first time setup, load the Ooyala player
  // Otherwise, simply set the embed code
  if (!hasBeenInitialized) {
    screenController.showScreen(splashScreen);
    initPlayer(playerData);
    $("#tmp_video").remove();
  } else {
    reinitPlayer(playerData, event);
  }
  window.mediaManager.sendStatus(event.senderId, event.data.requestId, true);  
}

function onLoadEXP(e){
  printDebugMessage("MediaManager:onLoad", e);
  var params = event.data.media.customData;
  handleLoadingScreenInfo(params);
  initPlayer();
}

/**
 Allows to control dynamically debug console output about sender commands and ooyala player events
 **/
function printDebugMessage(command, event, ignorePattern) {
  if (event) {
    if (event.data && event.data.customData) {
      if (typeof event.data.customData.debug === "boolean") {
        var newDebug = event.data.customData.debug;
        if (debug !== newDebug) {
          if (debug) {
            console.log(CHROMECAST_DEBUG_TAG, "disabling debug");
          } else {
            console.log(CHROMECAST_DEBUG_TAG, command, JSON.stringify(event, null, '\t'));
          }
          debug = newDebug;
        } else if (debug) {
          console.log(CHROMECAST_DEBUG_TAG, command, JSON.stringify(event, null, '\t'));
        }
      }
    } else if (debug && (!ignorePattern || command.indexOf(ignorePattern) < 0)) {
      console.log(PLAYER_DEBUG_TAG, command, JSON.stringify(event, null, '\t'));
    }
  } else if (debug) {
    console.log(CHROMECAST_DEBUG_TAG, command);
  }
}

/**
 Get the instance of the cast receiver
 if one needs to debug CastReceiverManager, one can override methods
 (onReady, onSenderConnected, etc.) here.
 For more info on castReceiverManager,
 visit: https://developers.google.com/cast/docs/reference/receiver/cast.receiver.CastReceiverManager
 **/
 function setupCastReceiver() {
   window.castReceiverManager = cast.receiver.CastReceiverManager.getInstance();

   window.castReceiverManager.onSenderConnected = function(event) {
     senders = window.castReceiverManager.getSenders();
     printDebugMessage("connected senders", senders);
   }

   window.castReceiverManager.onSenderDisconnected = function(event) {
     senders = window.castReceiverManager.getSenders();
     // if the last sender disconnects, then stop the cast session entirely if it
     // was an explicit disconnection
     if ((senders.length === 0) && (event.reason == cast.receiver.system.DisconnectReason.REQUESTED_BY_SENDER)) {
        if (player !== null){
            player.destroy(function(){
                window.castReceiverManager.stop();
            });
        } else {
            window.castReceiverManager.stop();
        }        
     }
   }

   window.castReceiverManager.onShutdown = function(event) {
     senders = window.castReceiverManager.getSenders();
   }
 }

 /**
 This method opens a namespace channel for a message bus
 It then receives messages through onMessage and gets filtered into our
 communication protocol cases.
 For more info on castMessageBus,
 visit: https://developers.google.com/cast/docs/reference/receiver/cast.receiver.CastMessageBus
 **/
 function setupMessageBus() {
   // create message bus for communications between receiver and sender
   window.castMB = castReceiverManager.getCastMessageBus(window.namespace)
     
   // onMessage gets called every time the sender sends a message
   // It receives messages through ooyala's message bus 
   window.castMB.onMessage = function(evt) {
     // Adds error handling to the received messages
     var message = null;
     var ERROR_MESSAGE = "Exception in message format";

     // verify message 
     var message = null;
     if (evt && evt.data) {
       message = JSON.parse(evt.data);
       if (!message || !message.action) {
         console.error(ERROR_MESSAGE);
         return;
       }
     }

     switch (message.action) {
       case "setCCLanguage":
         setClosedCaptionsLanguage(message.data);
         break;
       case "getstatus":
         // if status is requested, return the state, playhead, and embedcode
         var status = {
           state: player.getState(),
           playhead: currentPlayheadTimeInfo,
           embed: currentEmbedCode
         }
         // only send the status back to the sender that requested it
         window.castMB.send(evt.senderId, JSON.stringify(status));
         break;
       case "error":
         // This message came from sender through ooyala namespace, its purpose is to render on 
         // Chromecast display errors that may come from sender side. This message has structure:
         // { action: 'error', message: chrome.cast.Error }
         // Both chrome.cast.Error's code and description will be printed on the screen
         displayCastMediaError(message.message);
         break;
     }
   }
 }


 function initPlayerExp(params){
  console.log("InitPlayer: ",params);
 }

 /**
 This initPlayer will be called when the sender sends the init call
 It will load Ooyala player and subscribe to all events that the player publishes
 **/
 function initPlayer(data) {
  ended = false;
   // Clear the initial timeout set to timeout on the splash screen
   if (data && data.ec) {
     clearTimeout(initialTimeout);
   }
   // mark as initialized
   hasBeenInitialized = true;
   currentEmbedCode = data.ec;

   // Change the V3 version here
   var v3Version;
   if (data && data.version) {
     v3Version = "version=" + data.version;
   }

   if (data && typeof data.debug === "boolean") {
     debug = data.debug;
   } else {
     debug = false;
   }

   // prepare the player load script
   var playerJs = document.createElement("script");
   playerJs.type = "text/javascript";
   playerJs.src = OOYALA_PLAYER_URL;

   var playerParams = {};
   if (data.params) {
     if (typeof data.params === "string") {
       playerParams = eval("(" + data.params + ")");
     } else if (typeof data.params === "object") {
       playerParams = data.params;
     }
   }
   if (typeof playerParams['autoplay'] !== "boolean") {
     playerParams['autoplay'] = true;
   }
   autoPlay = playerParams['autoplay'];
   ccLanguage = '';
   if (!!playerParams['ccLanguage']) {
     // player paramteres may contain ccLanguage: "en" (or other language), in which case
     // we should set up ccLanguage variable so that playback starts with closed captioning
     ccLanguage = playerParams['ccLanguage'];
   }

   //data.ec = "o2YWQ4YzE6ono3qI5c3fN-R3Jhi1yPXn";
   //data.ec = "hsdHIyYzE668escyHgrFiednk4831Un3"
   //playerParams.embedToken = "//player.ooyala.com/sas/embed_token/lhNmYyOuUnCvRiHi5NbFBBLOG4xm/o2YWQ4YzE6ono3qI5c3fN-R3Jhi1yPXn?api_key=lhNmYyOuUnCvRiHi5NbFBBLOG4xm.S9VRE&expires=1507108002&signature=U3zyP8bgBQwOZrofz8J+76rNtAVe4EkW5OMszkPTd1c&override_syndication_group=override_synd_groups_in_backlot";
   //var extra = {"api_ssl_server":"https://player-staging.ooyala.com","api_server":"http://player-staging.ooyala.com","auth_ssl_server":"https://player-staging.ooyala.com/sas","auth_server":"http://player-staging.ooyala.com/sas"};
   //Object.assign(playerParams, extra);

   if (!playerParams.onCreate) {
     playerParams.onCreate = function(player) {
       
       player.mb.subscribe("*", "chromecast", function(evt) {
        switch (evt) {
          case OO.EVENTS.PLAYHEAD_TIME_CHANGED:
            currentPlayheadTimeInfo = arguments;
            duration = arguments[2];
            // As the playhead moves, update the progress bar, playhead, and duration
            controls.setValuePlayhead(currentPlayheadTimeInfo);
            sendToAllSenders(JSON.stringify(arguments));
            break;
          case OO.EVENTS.PLAYED:
            // If finished playing, display the splash screen
            screenController.showScreen(splashScreen);
            window.mediaManager.onEnded();
            
            sendToAllSenders(JSON.stringify(arguments));
            break;
          case OO.EVENTS.SET_EMBED_CODE:
            if ($("#cc_track")) {
              // remove track element for closed captions, if any - a new one will be created
              // if needed
              $("#cc_track").remove();
            }
            screenController.showScreen(loadingScreen);
            break;
          case OO.EVENTS.STREAM_PLAYING:
            // Show the player screen
            screenController.showScreen(playerScreen, "setClosedCaptionsLanguage(ccLanguage)");
            // Fade out the title, labels, and the scrubber after a specified delay
            controls.fadeOutControls(controls.getDelayInMillis());
            // Replace pause icon by play icon and fade it out after a specified delay
            controls.fadeOutPausePlay(controls.getDelayInMillis());
            controls.setDisplaySpinner("none");
            break;
          case OO.EVENTS.PAUSED:
            // Finish fading of of play button if this is the case
            finishFadeEffect(controls.playIcon);
            // Show all the controls and make sure playhead has been updated
            controls.showControls();
            // Fade out the title, labels, and the scrubber after a specified delay
            controls.fadeOutControls(controls.getDelayInMillis());
            controls.setValuePlayhead(currentPlayheadTimeInfo);
            sendToAllSenders(JSON.stringify(arguments));
            break;
          case OO.EVENTS.PLAYBACK_READY:
            // Assign the root element and controls when player is created

            rootElement = document.querySelector(".innerWrapper");
            window.mediaElement = document.querySelectorAll(`#${playerId}`)[0];
            printDebugMessage("new mediaElement", window.mediaElement);
            if (window.mediaElement) {
             window.mediaManager.setMediaElement(window.mediaElement);
            } 

            if (controls === null) {
              controls = new _Controls(rootElement);
            }

            controls.showControls();
            // Handling timeouts
            handleReceiverTimeouts(player);
            break;
          case OO.EVENTS.SEEKED:
            controls.setValuePlayhead(currentPlayheadTimeInfo);
            controls.fadeOutScrubber();
            sendToAllSenders(JSON.stringify(arguments));
            break;
          case OO.EVENTS.BUFFERING:
            // Show spinner
            controls.setDisplaySpinner("block");
            break;
          case OO.EVENTS.BUFFERED:
            // Show the player screen
            screenController.showScreen(playerScreen, "setClosedCaptionsLanguage(ccLanguage)");
            // Fade out the title, labels, and the scrubber after a specified delay
            controls.fadeOutControls(controls.getDelayInMillis());
            // Replace pause icon by play icon and fade it out after a specified delay
            controls.fadeOutPausePlay(controls.getDelayInMillis());

            // Hide spinner
            controls.setDisplaySpinner("none");
            break;
          case OO.EVENTS.AUTHORIZATION_FETCHED:
            var stream = arguments[1].streams[0];
            if (stream) {
              if (stream.is_live_stream) {
                printDebugMessage("Live stream:", arguments[1].streams[0].delivery_type);
                isLiveStream = true;
              } else {
                printDebugMessage("Stream type:", arguments[1].streams[0].delivery_type);
              }
            } else {
              printDebugMessage("No stream info", null);
            }
            break;
          case OO.EVENTS.CONTENT_TREE_FETCHED:
            // We should clear closed captions resource map as it may be populated from from
            // playback of previous title
            if (!$.isEmptyObject(ccResourceMap)) {
              ccResourceMap = {}
            }
            // Closed captions availability for this asset is known when content tree is
            // fetched. Content tree data is available in arguments[1], closed captions
            // information is stored in closed_captions_vtt object of content tree
            if (arguments[1].closed_captions_vtt) {
              var ccData = arguments[1].closed_captions_vtt;
              var languages = ccData.languages;
              for (var i in languages) {
                // Populate resource map of closed captions, it has format: "language" => URL
                printDebugMessage("CC:", languages[i] + " " + ccData.captions[languages[i]].url);
                ccResourceMap[languages[i]] = ccData.captions[languages[i]].url;
              }
            }
            break;
          case OO.EVENTS.SEEK:
            // Just show seek bar, duration and played labels
            controls.showScrubber();
            sendToAllSenders(JSON.stringify(arguments));
            break;
          case OO.EVENTS.CLOSED_CAPTIONS_INFO_AVAILABLE:
          case OO.EVENTS.PLAYING:
            window.mediaElement = document.querySelectorAll(`#${playerId}`)[0];
            if (window.mediaElement) {
              window.mediaManager.setMediaElement(window.mediaElement);
            }          
            sendToAllSenders(JSON.stringify(arguments));
            break;
          case OO.EVENTS.ERROR:
            // Display the error screen with the proper errors
            screenController.showScreen(errorScreen);
            // Display the title and description errors the index 1 of the arguments array
            // is an object containing the OO.ERROR code
            var error = "";
            if (arguments[1] && arguments[1].code) {
              error = arguments[1].code;
            }

            displayErrorTitleDescription(error);
            sendToAllSenders(JSON.stringify(arguments));
            break;
          case OO.EVENTS.ADS_PLAYED:
            console.log("Ya se terminaron los ADSSSS  ", arguments);
            adsPlayed = true;
            break;
          case OO.EVENTS.WILL_PLAY_ADS:
            console.log("Voy a tocar los Adddddss papuuuuu!!!!", arguments);
            hasAds = true;
            break;
          case OO.EVENTS.EMBED_CODE_CHANGED:
            console.log("EMBED_CODE_CHANGED, ", arguments);
            break;
          case OO.EVENTS.VC_VIDEO_ELEMENT_CREATED:
            playerId = "bitmovinplayer-video-" + arguments[1].domId;
            break;
        }
        printDebugMessage("receiver.html " + evt, arguments, "playheadTimeChanged");
       });
     }
   }

   // when the script has loaded, create the player
   playerJs.onload = (function(data) {
     playerParams.debug = true;
     player = OO.Player.create('player', data.ec, playerParams);
   }).bind(this, data);
   document.head.appendChild(playerJs);
 }

 /**
 Sets the embed code of the player with the parameters
 **/
 function reinitPlayer(data, event) {
   if (data && data.ec) {
     debug = data.debug;

     currentEmbedCode = data.ec;

     //if the embed code it is the same, just trigger the replay event
    if (player && player.getEmbedCode() === currentEmbedCode){
      //window.mediaManager.onPlayAgain(event);
      player.mb.publish(OO.EVENTS.REPLAY);
      return;
    }

    ended = false;


     isLiveStream = false;
     duration = 0;
     var playerParams = {};
     if (data.params) {
       if (typeof data.params === "string") {
         playerParams = eval("(" + data.params + ")");
       } else if (typeof data.params === "object") {
         playerParams = data.params;
       }
     }
     if (typeof playerParams['autoplay'] !== 'boolean') {
       playerParams['autoplay'] = true;
     }
     autoPlay = playerParams['autoplay'];
     ccLanguage = '';
     if (!!playerParams['ccLanguage']) {
       // We should also check for closed captions-related player parameter on playback of next asset,
       // and set ccLanguage variable so that playback starts with closed captioning
       ccLanguage = playerParams['ccLanguage'];
     }

     player.setEmbedCode(data.ec, playerParams);
     if (controls) {
       var title = (!data.title) ? "" : data.title;
       var promo_url = (!data.promo_url) ? "" : data.promo_url;
       promoImageElement.src = promo_url  + "?t=" + new Date().getTime();
       controls.reset(title, promo_url);
       controls.showControls();
     }
   }
 }

 /**
 This sends a message to all senders that are connected to this receiver
 **/
 function sendToAllSenders(message) {
   if (window.castMB && senders.length > 0) {
     window.castMB.broadcast(message);
   }
 }

 /**
 Closed captions - enable if language argument is not empty / disable if language argument is empty
 **/
 function setClosedCaptionsLanguage(language) {
   if (!language && !ccLanguage) {
     return;
   }
   if (isLiveStream) {
     // Setting CC is required right away, language selection was passed in player params
     player.mb.publish(OO.EVENTS.SET_CLOSED_CAPTIONS_LANGUAGE, '', { type: cast.player.api.CaptionsType.CEA608, data: language });
     if (!!language) {
       // sender will enable CC button on this event, otherwise it will be disabled
       player.mb.publish(OO.EVENTS.CLOSED_CAPTIONS_INFO_AVAILABLE, { lang : 'live', value : 'Live Closed Captions' });
     }
   } else {
    player.mb.publish(OO.EVENTS.SET_CLOSED_CAPTIONS_LANGUAGE, language);
   }
   ccLanguage = language;
 }

 /*************************************************************************/
 // SCREEN TRANSITION CONTROLLER
 /*************************************************************************/

 /**
 This controls which screen should be shown by hiding the others
 **/
 function _ScreenController(elements) {
   this.screens = elements;
 }

 /**
 This function will make sure to only display the screen that is passed
 as the parameter while hiding the others
 **/
 _ScreenController.prototype.showScreen = function(screenToShow, callback) {
   if (this.currentScreen === screenToShow) {
     // some events come up more than once, so we should ignore repeated requests 
     // as it may cause problems if to-be-performed actions are defined
     return;
   }

   for (var index in this.screens) {
     if (this.screens[index] !== screenToShow) {
       this.screens[index].style.display = "none";
     }
   }

   if (!!callback && typeof callback === 'string') {
     eval(callback);
   }

   screenToShow.style.display = "block";
   this.currentScreen = screenToShow;
 }

 /**
 Set the necessary UI elements for ease of use
 Also, initialize the screen controller to handle the transitioning of screens

 You are welcomed to modify the necessary screens and how they interact based on your use case.
 These screens DOM are instantiated at the beginning of this HTML page.
 **/
 function initUIElements() {
   document.getElementById('splash_image').src = SPLASH_SCREEN_SRC;
   document.getElementById('logo_image').src = LOGO_IMAGE_SRC;

   promoImageElement = document.getElementById('promo_image');
   titleElement = document.getElementById('loading_title');
   descriptionElement = document.getElementById('loading_description');

   splashScreen = document.querySelector("#splash_screen");
   loadingScreen = document.querySelector("#loading_screen");
   playerScreen = document.querySelector("#player");
   errorScreen = document.querySelector("#error_screen");
   screens = [ splashScreen, loadingScreen, playerScreen, errorScreen ];
   screenController = new _ScreenController(screens);
 }

 /**
 Check to make sure all 3 parts- promo, title, and description were sent
 then change the variables
 **/
 function handleLoadingScreenInfo(data) {
   titleElement.innerHTML = (!data.title) ? "" : data.title;
   descriptionElement.innerHTML = (!data.description) ? "" : data.description;
   promoImageElement.src = (!data.promo_url) ? "" : data.promo_url;
 }

 /*************************************************************************/
 // CONTROL BAR UI
 /*************************************************************************/

 /**
 Function to use a fade effect using webkit transitions
 **/
 function fadeEffect(element, opacity, time) {
   var listener = function() {
     element.style.webkitTransition = '';
     element.removeEventListener('webkitTransitionEnd', listener, false);
   };
   element.addEventListener('webkitTransitionEnd', listener, false);
   element.style.webkitTransition = 'opacity ' + time + 's linear';
   element.style.opacity = opacity;
 }

 /**
 Function to finish fade effect of an element
 **/
 function finishFadeEffect(element) {
   var listener = function() {
     element.style.webkitTransition = '';
     element.removeEventListener('webkitTransitionEnd', listener, false);
   };
   element.removeEventListener('webkitTransitionEnd', listener, false);
   element.style.webkitTransition = '';
   element.style.opacity = 0;
 }

 /**
 This operates all of the video controls that are put on top of the video
 It works as an overlay with a higher z-index than the video
 **/
 function _Controls(rootElement) {
   this.rootElement = rootElement;
   this.currentScreen = null;

   /** CONSTANTS FOR TRANSITION EFFECTS **/
   // Adjusts the size of the spinner
   this.spinnerScale = 0.10;
   // Start the opacity at 0 (invisible) and make it transition to 1 (visible)
   this.desiredOpacity = 0;
   this.originalOpacity = 1;

   // The duration and times for other transitions
   this.secondsToTransition = 1;
   this.secondsToScrubberTransition = 5;
   this.millisToFade = 2000;
   /** END CONSTANTS FOR TRANSITIONS**/

   // Initialize the controls
   this.init();
 }

 /*
 _Controls specifies how control Bar is going to appear on Receiver.
 You are welcomed to modify, add and remove:
   - Logo: watermark image and TV rating
   - Video Metadata: promo image, Title
   - Play / Pause button
   - Scrubber bar
   - Time and Duration
   - Spinner icon
 */
 _Controls.prototype.init = function() {
   this.controls_wrap = document.createElement('div');
   this.controls_wrap.className = "oo_controls";
   this.rootElement.appendChild(this.controls_wrap);
   // Append the initial html to the control wrapper
   document.querySelector(".oo_controls").innerHTML +=
                            '<div id="spinner_wrapper">\
                               <div id="spinner_icon" class="absolute_center spinner"></div>\
                             </div>\
                             <div id="promo_title_container">\
                               <img id ="promo_icon" />\
                               <div id="title_wrapper">\
                                 <h1 id="title_header" class="cast_text"></h1>\
                               </div>\
                             </div>\
                             <div id="watermark_wrapper">\
                               <img id ="watermark_icon" />\
                             </div>\
                             <div id="scrubber_wrapper">\
                               <div id ="play_pause_wrapper">\
                                 <img id="pause_icon" />\
                                 <img id="play_icon" />\
                               </div>\
                               <div id ="playhead_container">\
                                 <h5 id="playhead">00:00</h5>\
                               </div>\
                               <div id ="seek_bar">\
                                 <div id="progress"></div>\
                                 <div id="buffered_progress"></div>\
                               </div>\
                               <div id = "duration_wrapper">\
                                 <h5 id = "duration">00:00</h5>\
                               </div>\
                             </div>';

   // Initialize variables to their associated DOM elements
   this.seekContainer = document.querySelector('#seek_bar');
   this.progressBar = document.querySelector('#progress');
   this.bufferedBar = document.querySelector('#buffered_progress');
   this.durationLabel = document.querySelector('#duration');
   this.playheadLabel = document.querySelector('#playhead');
   this.videoTitle = document.querySelector('#title_header');
   this.pauseIcon = document.querySelector('#pause_icon');
   this.playIcon = document.querySelector('#play_icon');
   this.spinnerIcon = document.querySelector("#spinner_icon");
   this.promoIcon = document.querySelector("#promo_icon");
   this.watermark = document.querySelector("#watermark_icon");

   // Set the image sources and text to their proper values
   this.videoTitle.innerHTML = titleElement.innerHTML;
   this.pauseIcon.src = PAUSE_ICON_SRC;
   this.playIcon.src = PLAY_ICON_SRC;
   this.playIcon.style.opacity = 0;
   this.promoIcon.src = promoImageElement.src;
   promoImageElement.src += "?t=" + new Date().getTime();
   this.watermark.src = WATERMARK_ICON_SRC;

   // Setting up spinner icon
   var spinnerWidthAndHeight = $("#loading_screen").height() * this.spinnerScale;
   this.spinnerIcon.style.width = spinnerWidthAndHeight;
   this.spinnerIcon.style.height= spinnerWidthAndHeight;

   // The first array of elements relate solely to the scrubber itself
   // The second array contains all of the controls that needed to be faded out
   this.scrubberFadeElements = [ this.playheadLabel, this.durationLabel, this.seekContainer ];
   this.controlsFadeElements = [ this.playheadLabel, this.durationLabel, this.seekContainer,
                                 this.videoTitle, this.promoIcon ];
 }

 /**
 Setter method for updating control bar UI element of Title and promo image
 **/
 _Controls.prototype.reset = function(title, promo_url) {
   this.videoTitle.innerHTML = title;
   this.promoIcon.src = promo_url;
   this.setValue(0, 0, 0, 0);

 }

 /**
 Getter method for the milliseconds to fade
 **/
 _Controls.prototype.getDelayInMillis = function() {
   return this.millisToFade;
 }

 /**
 Setter method for setting the display property of the spinner
 **/
 _Controls.prototype.setDisplaySpinner= function(display) {
   if (this.spinnerIcon) {
     this.spinnerIcon.style.display = display;
   }
 }

 /**
 Fade out all scrubber-related elements
 **/
 _Controls.prototype.fadeOutScrubber = function() {
   for (var element in this.scrubberFadeElements) {
     fadeEffect(this.scrubberFadeElements[element], this.desiredOpacity, this.secondsToScrubberTransition);
   }
 }

 /**
 Replace pause icon by play icon and within a specified delay, fade out play icon
 **/
 _Controls.prototype.fadeOutPausePlay = function(delay) {
   finishFadeEffect(this.pauseIcon);
   this.playIcon.style.webkitTransition = '';
   this.playIcon.style.opacity = this.originalOpacity;
   var self = this;
   setTimeout(function() {
     fadeEffect(self.playIcon, self.desiredOpacity, self.secondsToTransition);
   }, delay);
 }

 /**
 Within a specified delay, fade out all the control-related elements
 **/
 _Controls.prototype.fadeOutControls = function(delay) {
   var self = this;
   setTimeout(function() {
     for (var element in self.controlsFadeElements) {
       fadeEffect(self.controlsFadeElements[element], self.desiredOpacity, self.secondsToTransition);
     }
   }, delay);
 }

 /**
 Shows only scrubber related elements by setting elements to be visible at
 opacity 1
 **/
 _Controls.prototype.showScrubber = function() {
   for (var element in this.scrubberFadeElements) {
     this.scrubberFadeElements[element].style.webkitTransition = '';
     this.scrubberFadeElements[element].style.opacity = this.originalOpacity;
   }
 }

 /**
 Shows all control related elements by setting elements to be visible at opacity 1
 **/
 _Controls.prototype.showControls = function() {
   for (var element in this.controlsFadeElements) {
     this.controlsFadeElements[element].style.webkitTransition = '';
     this.controlsFadeElements[element].style.opacity = this.originalOpacity;
   }
   this.pauseIcon.style.webkitTransition = '';
   this.pauseIcon.style.opacity = this.originalOpacity;
 }

 /**
 Call the setValue to update the playhead information
 **/
 _Controls.prototype.setValuePlayhead = function(playhead) {
   // Explanation of the playhead parameter array:
   // 1 is time played, 2 is duration, 3 is buffered
   // 4 (start, end) is (mintime and maxtime)
   this.setValue(playhead[1], playhead[3], playhead[4].start, playhead[4].end);
 }

 /**
 This sets the buffered and playhead related controls' positions
 **/
 _Controls.prototype.setValue = function(played, buffered, minTime, maxTime) {
   // Calculate played percentage
   var playedPercent = (played - minTime) / (maxTime - minTime);
   playedPercent = Math.min(Math.max(0, playedPercent), 1);
   this.progressBar.style.width =  (playedPercent * 100) + "%";

   // calculate buffer percentage
   var bufferedPercent = (buffered - minTime) / (maxTime - minTime);
   bufferedPercent = Math.min(Math.max(0, bufferedPercent), 1);
   this.bufferedBar.style.width = (bufferedPercent * this.seekContainer.clientWidth ) + 'px';

   //labels using the equivalent of OO.formatSeconds
   this.playheadLabel.innerHTML = timeFormat(played || 0);
   this.durationLabel.innerHTML = isLiveStream ? "Live" : timeFormat(maxTime || 0);
 }

 /**
 Get a formatted time derived from the time in seconds
 **/
 function timeFormat(timeInSeconds) {
   if (timeInSeconds ===  Number.POSITIVE_INFINITY) {
     return '';
   }
   var seconds = parseInt(timeInSeconds,10) % 60;
   var hours = parseInt(timeInSeconds / 3600, 10);
   var minutes = parseInt((timeInSeconds - hours * 3600) / 60, 10);

   if (hours < 10) {
     hours = '0' + hours;
   }

   if (minutes < 10) {
     minutes = '0' + minutes;
   }

   if (seconds < 10) {
     seconds = '0' + seconds;
   }

   return (parseInt(hours,10) > 0) ? (hours + ":" + minutes + ":" + seconds) : (minutes + ":" + seconds);
 }

 /*************************************************************************/
 // TIMEOUT MANAGER CONTROLLER
 /*************************************************************************/

 /**
 The timeout controller that handles starting and stopping timeouts
 **/
 var _TimeoutManager = function(timeInMilis, events, player, eventListener) {
   this.timeoutDuration = timeInMilis;
   this.timeoutVariable = null;
   this.mb = player.mb;
   this.events = events;
   this.eventListener = eventListener.bind(this);

   // On instantiation, subscribe to all the events through the message bus
   this.subscribeToEvents();
 }

 /**
 Set a timeout that will stop the casting if the user does not send any
 other messages
 **/
 _TimeoutManager.prototype.startTimeout = function() {
   if (this.timeoutVariable) {
     this.stopTimeout();
   }
   this.timeoutVariable = setTimeout(function() {
     window.castReceiverManager.stop();
   }, this.timeoutDuration);
 }

 /**
 Simply clear the timeout above
 **/
 _TimeoutManager.prototype.stopTimeout = function() {
   if (this.timeoutVariable) {
     clearTimeout(this.timeoutVariable);
     this.timeoutVariable = null;
   }
 }

 /**
 Restart the timeout to stop casting
 **/
 _TimeoutManager.prototype.restartTimeout = function() {
   this.stopTimeout();
   this.startTimeout();
 }

 /**
 Subscribe to all the events and pipe it to our listener
 **/
 _TimeoutManager.prototype.subscribeToEvents = function() {
   for (var event in this.events) {
     this.mb.subscribe(this.events[event], "cast_receiver", this.eventListener);
   }
 }

 /**
 This function will handle all timeout related business for the cast receiver

 It will create timeoutmanager instances which subscribe to specified events that
 will call the callback function that is passed to the timeoutmanager
 **/
 function handleReceiverTimeouts(player) {
   var pauseEvents = [ OO.EVENTS.PAUSED, OO.EVENTS.PLAY, OO.EVENTS.SEEK,
                       OO.EVENTS.CHANGE_VOLUME, OO.EVENTS.SET_EMBED_CODE ];
   var splashEvents = [ OO.EVENTS.PLAYED, OO.EVENTS.SET_EMBED_CODE ];
   var loadingEvents = [ OO.EVENTS.SET_EMBED_CODE, OO.EVENTS.PLAY];

   // timeoutmanager instance to handle timeouts related to timing out on the splash screen
   var splashTimeout = new _TimeoutManager(SPLASH_SCREEN_TIMEOUT_MILLIS, splashEvents, player,
   function(evt) {
     switch (evt) {
       // If finished playing, set a timeout
       case OO.EVENTS.PLAYED:
         this.startTimeout();
         break;
       // If the user sets an embed code, clear the timeout
       case OO.EVENTS.SET_EMBED_CODE:
         this.stopTimeout();
         break;
     }
   });

   // timeoutmanager instance to handle timeouts related to timing out on the loading screen
   var loadingTimeout = new _TimeoutManager(LOADING_SCREEN_TIMEOUT_MILLIS, loadingEvents, player,
   function(evt) {
     switch (evt) {
       // If started playing, clear timeout
       case OO.EVENTS.PLAY:
         this.stopTimeout();
         break;
       // If the user sets an embed code, start timeout
       case OO.EVENTS.SET_EMBED_CODE:
         this.startTimeout();
         break;
     }
   });

   // timeoutmanager instance to handle timeouts related to timing out when the video is paused
   var pauseTimeout = new _TimeoutManager(PAUSE_STATE_TIMEOUT_MILLIS, pauseEvents, player,
   function(evt) {
     switch (evt) {
       // If the video is paused, start the timeout
       case OO.EVENTS.PAUSED:
         this.startTimeout();
         break;
       // If the user plays or sets embed code, clear the timeout
       case OO.EVENTS.PLAY:
       case OO.EVENTS.SET_EMBED_CODE:
         this.stopTimeout();
         break;
       // If the user seeks or changes the volume, which doesn't influence
       // the player state, restart the timeout if in a paused state
       case OO.EVENTS.SEEK:
       case OO.EVENTS.CHANGE_VOLUME:
         if (player.getState() === OO.STATE.PAUSED) {
           this.restartTimeout();
         }
         break;
     }
   });
 }

 /*************************************************************************/
 // ERROR MESSAGES
 /*************************************************************************/

 function displayCastMediaError(error) {
   screenController.showScreen(errorScreen);
   document.querySelector("#error_title").innerHTML = "There Is an Error";
   if (error.code) {
     document.querySelector("#error_code").innerHTML = error.code;
   }

   if (error.description) {
     document.querySelector("#error_description").innerHTML = error.description;
   } else if (!error.code) {
     document.querySelector("#error_description").innerHTML = JSON.stringify(error);
   }
 }

 /**
 This function handles mapping the error messages from core player's message bus and displaying
 both the Title and Description to the User.
 You are welcomed to change the error messaging here.
 **/
 function displayErrorTitleDescription(error) {
   var defaultErrorTitle = "There Is an Error";
   var defaultErrorDescription = "Please Restart Your Application";

   // Create mapping of Ooyala errors to error messages
   var errorMap = {};
   // General API Errors
   errorMap[OO.ERROR.API.NETWORK] = "Cannot Contact Server";
   errorMap[OO.ERROR.API.SAS.GENERIC] = "Invalid Authorization Response";
   errorMap[OO.ERROR.API.SAS.GEO] = "This video is not authorized in your location";
   errorMap[OO.ERROR.API.SAS.DOMAIN] = "This video is not authorized for your domain";
   errorMap[OO.ERROR.API.SAS.FUTURE] = "This video will be available soon";
   errorMap[OO.ERROR.API.SAS.PAST] = "This video is no longer available";
   errorMap[OO.ERROR.API.SAS.DEVICE] = "This video is not authorized for playback on this device";
   errorMap[OO.ERROR.API.SAS.PROXY] = "An anonymous proxy was detected. Please disable the proxy and retry.";
   errorMap[OO.ERROR.API.SAS.CONCURRENT_STREAMS] = "You have exceeded the maximum number of concurrent streams";
   errorMap[OO.ERROR.API.SAS.INVALID_HEARTBEAT] = "Invalid heartbeat response";
   errorMap[OO.ERROR.API.SAS.ERROR_DEVICE_INVALID_AUTH_TOKEN] = "Invalid Ooyala Player Token";
   errorMap[OO.ERROR.API.SAS.ERROR_DEVICE_LIMIT_REACHED] = "Device limit reached";
   errorMap[OO.ERROR.API.SAS.ERROR_DEVICE_BINDING_FAILED] = "Device binding failed";
   errorMap[OO.ERROR.API.SAS.ERROR_DEVICE_ID_TOO_LONG] = "Device id too long";
   errorMap[OO.ERROR.API.SAS.ERROR_DRM_RIGHTS_SERVER_ERROR] =
                 "General SOAP error from DRM server, will pass message from server to event";
   errorMap[OO.ERROR.API.SAS.ERROR_DRM_GENERAL_FAILURE] = "General error with acquiring license";
   errorMap[OO.ERROR.API.CONTENT_TREE] = "Invalid Content";
   errorMap[OO.ERROR.API.METADATA] = "Invalid Metadata";

   // General Playback Errors
   errorMap[OO.ERROR.PLAYBACK.GENERIC] = "Could not play the content";
   errorMap[OO.ERROR.PLAYBACK.STREAM] = "This video isn't encoded for your device";
   errorMap[OO.ERROR.PLAYBACK.LIVESTREAM] = "Live stream is off air";
   errorMap[OO.ERROR.PLAYBACK.NETWORK] = "Network connection temporarily lost";

   // General Ooyala Errors
   errorMap[OO.ERROR.UNPLAYABLE_CONTENT] = "This video is not playable on this player";
   errorMap[OO.ERROR.INVALID_EXTERNAL_ID] = "Invalid External ID";
   errorMap[OO.ERROR.EMPTY_CHANNEL] = "This channel is empty";
   errorMap[OO.ERROR.EMPTY_CHANNEL_SET] = "This channel set is empty";
   errorMap[OO.ERROR.CHANNEL_CONTENT] = "This channel is not playable at this time";
   errorMap[OO.ERROR.STREAM_PLAY_FAILED] = "This video is not encoded for your device";

   // Chromecast Specific Errors
   // https://developers.google.com/cast/docs/reference/player/cast.player.api.ErrorCode
   errorMap[OO.ERROR.CHROMECAST.MANIFEST] = "Error loading or parsing the manifest";
   errorMap[OO.ERROR.CHROMECAST.MEDIAKEYS] = "Error fetching the keys or decrypting the content";
   errorMap[OO.ERROR.CHROMECAST.NETWORK] = "Network error";
   errorMap[OO.ERROR.CHROMECAST.PLAYBACK] = "Error related to media playback";

   var errorTitle = defaultErrorTitle;
   // Use the error mapping created to generate the description
   var errorDescription = (!errorMap[error]) ? defaultErrorDescription : errorMap[error];

   // Set the DOM elements to its respective title and description
   document.querySelector("#error_title").innerHTML = errorTitle;
   document.querySelector("#error_description").innerHTML = errorDescription;
 }