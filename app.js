const _eventnamespace = "ooyala-chromecast";

// ooyala player controller

const playerCtrl = (function (OO) {
    var _player = null;
    var _defaultParams = {
            autoplay: true,
            onCreate: _onCreate
    }

    function initPlayer(data) {
        var params = Object.assign({}, data.params);
        if (_player === null) {
            OO.ready(function () {
                _player = OO.Player.create('player', data.ec, params);
            });
        } else{
            params.debug = true;
            _player.setEmbedCode(data.ec, params);
        }        
    }

    //utils

    function getVideoEl(elementId) {
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
        _playerEl = getVideoEl(data.domId);
        if (_playerEl) {
            mediaManager.setMediaElement(_playerEl);
        }
    }

    function _onCreate(player) {
        player.mb.subscribe(OO.EVENTS.VC_VIDEO_ELEMENT_CREATED, _eventnamespace, onVcCreatedElement)
        player.mb.subscribe(OO.EVENTS.PLAYER_CREATED, _eventnamespace, onPlayerCreated);

    }

    return {setPlayer: _initPlayer};
})(OO);

//elements block

var _splashStatus = document.querySelector('#status-cast');
var _playerEl = document.getElementById('temp-video');;



//set log level
//cast.receiver.logger.setLevelValue(cast.receiver.LoggerLevel.DEBUG);

mediaManager = new cast.receiver.MediaManager(_playerEl);

////media Manager stuff

mediaManager.onLoad = function(event){
    let data = event.data.media.customData;
    // TODO: Handle loading Screen
    
    playerCtrl.setPlayer(data);
    mediaManager.sendStatus(event.senderId, event.data.requestId, true);
}

castManager = cast.receiver.CastReceiverManager.getInstance();

castManager.onReady = (event) => {
    //let capabilities = crm.getDeviceCapabilities();
    console.log("System ready");
    _splashStatus.textContent = "Ready to cast"
    //initPlayer();
}

castManager.onSenderConnected = function (event) {
    senders = castManager.getSenders();
    console.log("connected senders", senders);
}

castManager.onSenderDisconnected = function (event) {
    senders = castManager.getSenders();
    // if the last sender disconnects, then stop the cast session entirely if it was
    // an explicit disconnection
    if ((senders.length === 0) && (event.reason == cast.receiver.system.DisconnectReason.REQUESTED_BY_SENDER)) {
        castManager.stop();
    }
}

castManager.onShutdown = function (event) {
    senders = castManager.getSenders();
    console.log(senders);
}

castManager.start();