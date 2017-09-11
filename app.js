const _eventnamespace = "ooyala-chromecast";
const _messagebusnamespace = "urn:x-cast:ooyala";
var _mediaManager = null;
var _castManager = null;
var _messageBus = null;

// ooyala player controller

var playerCtrl = (function (OO) {
    var _player = null;

    //utils

    function _getVideoEl(elementId) {
        var el = document.querySelector(`#{elementId} video`) || document.querySelector(`#{elementId}`)
        if (el && el.nodeName !== "VIDEO") {
            throw `Video Element with ID: {elementId} not found`
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
        _playerEl = _getVideoEl(data.domId);
        if (_playerEl) {
            mediaManager.setMediaElement(_playerEl);
        }
    }

    function _onPlayheadTimeChanged( currentTime, duration, buffer, seek, videoId) {
        console.log("playhead time changed: ", arguments);
    }

    function _onCreate(player) {
        player.mb.subscribe(OO.EVENTS.VC_VIDEO_ELEMENT_CREATED, _eventnamespace, _onVcCreatedElement);
        player.mb.subscribe(OO.EVENTS.PLAYER_CREATED, _eventnamespace, _onPlayerCreated);
        player.mb.subscribe(OO.EVENTS.PLAYHEAD_TIME_CHANGED, _eventnamespace, _onPlayheadTimeChanged);

    }

    function _initPlayer(data) {
        var params = Object.assign({}, data.params);
        params.onCreate = _onCreate;
        if (_player === null) {
            OO.ready(function () {
                _player = OO.Player.create('player', data.ec, params);
            });
        } else{
            _player.setEmbedCode(data.ec, params);
        }        
    }

    return {
        setPlayer: _initPlayer,
        getState: function() {
            return _player.getState();
        }
    };
})(OO);

//elements block

var _splashStatus = document.querySelector('#status-cast');
var _playerEl = document.getElementById('temp-video');;



//set log level
//cast.receiver.logger.setLevelValue(cast.receiver.LoggerLevel.DEBUG);

_mediaManager = new cast.receiver.MediaManager(_playerEl);

////media Manager stuff

_mediaManager.onLoad = function(event){
    let data = event.data.media.customData;
    // TODO: Handle loading Screen
    
    playerCtrl.setPlayer(data);
    _mediaManager.sendStatus(event.senderId, event.data.requestId, true);
}

_mediaManager.onGetStatus = function (event) {
    _mediaManager.sendStatus(event.senderId, event.data.requestId, true);
}

// Message bus

/* function handleMessage(e) {
    console.log(e);

    var data = JSON.parse(e.data);
    switch (data.action) {
        case "setCCLanguage":
            //setClosedCaptionsLanguage(message.data);
            break;
        case "getstatus":
            var status = {
                state: playerCtrl.getState(),
                playhead: currentPlayheadTimeInfo,
                embed: currentEmbedCode
            }
            _messageBus.send(e.senderId, JSON.stringify(status));
            break;
        case "error":
            //displayCastMediaError(message.message);
            break;
    }
} */


//_messageBus.onMessage(handleMessage);

// Cast Manager stuff

_castManager = cast.receiver.CastReceiverManager.getInstance();

_messageBus = _castManager.getCastMessageBus(_messagebusnamespace);

_castManager.onReady = (event) => {
    //let capabilities = crm.getDeviceCapabilities();
    console.log("System ready");
    _splashStatus.textContent = "Ready to cast"
    //initPlayer();
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

_castManager.start();