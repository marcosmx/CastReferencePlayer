const _eventnamespace = "ooyala-chromecast";
const _messagebusnamespace = "urn:x-cast:ooyala";
var _mediaManager = null;
var _castManager = null;
var _messageBus = null;

// ooyala player controller

var playerCtrl = (function (OO) {
    var _player = null;
    var _playHeadInfo = {};
    var _currentAsset = null;

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

    function _onPlayheadTimeChanged() {
        _playHeadInfo = [...arguments];
        console.log("playhead time changed: ", _playHeadInfo);
    }

    function _onInitialPlay(e){
        console.log(e);
        _messageBus.broadcast(JSON.stringify({0:"playing"}));
    }

    function _onPause() {
        _player.mb.publish(OO.EVENTS.PAUSE);
    }

    function _onPaused(e) {
        var message = Object.assign({}, e); // flatten the object and just keep direct properties
        _messageBus.broadcast(JSON.stringify(message));
    }

    function _onStop(){
        _player.mb.publish(OO.EVENTS.PLAYED, {type:"stop"});
    }

    function _onCreate(player) {
        player.mb.subscribe(OO.EVENTS.VC_VIDEO_ELEMENT_CREATED, _eventnamespace, _onVcCreatedElement);
        player.mb.subscribe(OO.EVENTS.PLAYER_CREATED, _eventnamespace, _onPlayerCreated);
        player.mb.subscribe(OO.EVENTS.PLAYHEAD_TIME_CHANGED, _eventnamespace, _onPlayheadTimeChanged);
        player.mb.subscribe(OO.EVENTS.INITIAL_PLAY, _eventnamespace, _onInitialPlay);
        player.mb.subscribe(OO.EVENTS.PAUSED, _eventnamespace, _onPaused);       

    }

    function _initPlayer(data) {
        var params = Object.assign({}, data.params);
        params.onCreate = _onCreate;
        data.ec = "JpeWNhbjrfKs0sIelRvR8R3YIEATk1ZG";
        //params.embedToken = "http://player.ooyala.com/sas/embed_token/lhNmYyOuUnCvRiHi5NbFBBLOG4xm/A2MGFyYTE6Dv_7o2E3zWqCcYAUyqO4t9?api_key=lhNmYyOuUnCvRiHi5NbFBBLOG4xm.S9VRE&expires=3042186829&&&&signature=AgkvXZW57DrxsLDdOiVEBWqkWPxxz75olqZfS505CeU";
        //var extra = {"api_ssl_server":"https://player-staging.ooyala.com","api_server":"http://player-staging.ooyala.com","auth_ssl_server":"https://player-staging.ooyala.com/sas","auth_server":"http://player-staging.ooyala.com/sas"};
        //Object.assign(params, extra);

        _currentAsset = data.ec;
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
        },
        getPlayHead: ()=>(_playHeadInfo),
        getCurrentAsset: ()=>(_currentAsset),
        stop: _onStop,
        pause: _onPause
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

// Cast Manager stuff

_castManager = cast.receiver.CastReceiverManager.getInstance();

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
                state: playerCtrl.getState(),
                playhead: playerCtrl.getPlayHead(),
                embed: playerCtrl.getCurrentAsset()
            }
            _messageBus.send(e.senderId, JSON.stringify(status));
            break;
        case "error":
            //displayCastMediaError(message.message);
            break;
    }
};

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