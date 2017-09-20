//elements block

var _splashStatus = document.querySelector('#status-cast');
var _playerEl = document.getElementById('temp-video');

const _eventnamespace = "ooyala-chromecast";
const _messagebusnamespace = "urn:x-cast:ooyala";
var _mediaManager = null;
var _castManager = null;
var _messageBus = null;
var _player = null;
var _playHeadInfo = {};
var _currentAsset = null;

// ooyala player controller utils

function _getVideoEl(elementId) {
    var el = document.querySelector(`#${elementId} video`) || document.querySelector(`#${elementId}`);
    if (el && el.nodeName !== "VIDEO") {
        throw `Video Element with ID: ${elementId} not found`
    }

    return el;
}

// Player events handlers

function _onPlayerCreated(e, data) {
    // here we need to handle the player ui controls
    console.log("on player Created", e, data, arguments);
}

function _onVcCreatedElement(e, data) {
    console.log("VC created Element");
    _playerEl.remove();
    _playerEl = null;
    _playerEl = _getVideoEl(data.domId);
    if (_playerEl) {
        mediaManager.setMediaElement(_playerEl);
    }
}

function _onPlayheadTimeChanged() {
    _playHeadInfo = [...arguments];
    //console.log("playhead time changed: ", _playHeadInfo);
}

function _onPlaying() {
    console.log("player ctrl: init playback ", arguments);
    _messageBus.broadcast(JSON.stringify(arguments));
}

function _onPause() {
    _player
        .mb
        .publish(OO.EVENTS.PAUSE);
}

function _onPaused(e) {
    var message = Object.assign({}, e); // flatten the object and just keep direct properties
    _messageBus.broadcast(JSON.stringify(message));
}

function _onStop() {
    _player
        .mb
        .publish(OO.EVENTS.PLAYED, {type: "stop"});
}

function _onCreate(player) {
    player.mb.subscribe(OO.EVENTS.VC_VIDEO_ELEMENT_CREATED, _eventnamespace, function(e, data){
        console.log("VC created Element");
        _playerEl.remove();
        _playerEl = null;
        _playerEl = _getVideoEl(data.domId);
        if (_playerEl) {
            mediaManager.setMediaElement(_playerEl);
        }
    });
    //player.mb.subscribe(OO.EVENTS.PLAYER_CREATED, _eventnamespace, _onPlayerCreated);
    player.mb.subscribe(OO.EVENTS.PLAYHEAD_TIME_CHANGED, _eventnamespace, function(){
        _playHeadInfo = [...arguments];
    });
    player.mb.subscribe(OO.EVENTS.PAUSED, _eventnamespace, function(){
        //var message = Object.assign({}, e); // flatten the object and just keep direct properties
        _messageBus.broadcast(JSON.stringify(arguments));
    });
    player.mb.subscribe(OO.EVENTS.PLAYING, _eventnamespace, function(){
        _messageBus.broadcast(JSON.stringify(arguments));
    });
}

function initPlayer(data) {
    var params = Object.assign({}, data.params);
    params.onCreate = _onCreate;
    _currentAsset = data.ec;
    if (_player === null) {
        console.log("player ctrl: about to create a new player instance", params);
        OO.ready(function () {
            _player = OO
                .Player
                .create('player', data.ec, params);
        });
    } else {
        console.log("player ctrl: set new embed code: ", data.ec)
        _player.setEmbedCode(data.ec, params);
    }
}

//set log level
//cast.receiver.logger.setLevelValue(cast.receiver.LoggerLevel.DEBUG);


////media Manager stuff
_mediaManager = new cast.receiver.MediaManager(_playerEl);

_mediaManager.onLoad = function(event){
    var data = event.data.media.customData;
    // TODO: Handle loading Screen
    
    //playerCtrl.setPlayer(data);
    initPlayer(data);
    _mediaManager.sendStatus(event.senderId, event.data.requestId, true);
}

 _mediaManager.onGetStatus = function (event) {
    _mediaManager.sendStatus(event.senderId, event.data.requestId, true);
}

_mediaManager["origOnStop"] = _mediaManager.onStop;
_mediaManager.onStop = function(event) {
    playerCtrl.stop();
    _mediaManager["origOnStop"](event);
}

_mediaManager["origOnPause"] = _mediaManager.onPause;
_mediaManager.onPause = function(event) {
    _mediaManager["origOnPause"](event);
    playerCtrl.pause();    
    _mediaManager.sendStatus(event.senderId, event.data.requestId, true);
}

_mediaManager.customizedStatusCallback = function(ms) {
    ms.data = { customData: { debug: true } }  // mmm this flag needs to be checked
    console.log("custom status cb: ", ms);
    return ms;
}

// Cast Manager stuff
_castManager = cast.receiver.CastReceiverManager.getInstance();

_castManager.onReady = (event) => {
    console.log("System ready");
    _splashStatus.textContent = "Ready to cast"
}

_castManager.onSenderConnected = function (event) {
    senders = _castManager.getSenders();
    console.log("connected senders", senders);
}

_castManager.onSenderDisconnected = function (event) {
    senders = _castManager.getSenders();
    // if the last sender disconnects, then stop the cast session entirely if it was
    // an explicit disconnection
    if ((senders.length === 0) && (event.reason == cast.receiver.system.DisconnectReason.REQUESTED_BY_SENDER)) {
        _castManager.stop();
    }
}

_castManager.onShutdown = function (event) {
    senders = _castManager.getSenders();
    console.log(senders);
}

// message Bus
_messageBus = _castManager.getCastMessageBus(_messagebusnamespace);

_messageBus.onMessage = function handleMessage(e) {
    console.log(e);

    var data = JSON.parse(e.data);
    switch (data.action) {
        case "setCCLanguage":
            //setClosedCaptionsLanguage(message.data);
            break;
        case "getstatus":
            var status = {
                state: _player.getState(),
                playhead: _playHeadInfo,
                embed: _currentAsset
            }
            _messageBus.send(e.senderId, JSON.stringify(status));
            break;
        case "error":
            //displayCastMediaError(message.message);
            break;
    }
};

_castManager.start();