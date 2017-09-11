const _eventnamespace = "ooyala-chromecast";

//elements block

var _splashStatus = document.querySelector('#status-cast');
var _playerVideo = document.getElementById('temp-video');;



//set log level
//cast.receiver.logger.setLevelValue(cast.receiver.LoggerLevel.DEBUG);

mediaManager = new cast.receiver.MediaManager(_playerVideo);

////media Manager stuff

mediaManager.onLoad = function(event){
    let data = event.data.media.customData;
    // TODO: Handle loading Screen
    
    initPlayer(data);
    mediaManager.sendStatus(event.senderId, event.data.requestId, true);
    //element_.remove();
}

// Player events handlers


function onPlayerCreated(e, data){
    console.log("on player Created", e, data, arguments);
}

function _onCreate(player){
    /* player.mb.subscribe("*", "ooyala-chromecast", function(e){
        switch (e) {
            case OO.EVENTS.PLAYER_CREATED:
                //remove temp element
                _playerVideo.remove();
                _playerVideo =  document.get
                //replace the media manager with the new element
                mediaManager.setMediaElement(mediaElement);                
                break;
        
            default:
                break;
        }
    }) */

    player.mb.subscribe(OO.EVENTS.VC_VIDEO_ELEMENT_CREATED, _eventnamespace, function(event, data){
        console.log("on vc element created", data);
    })

    player.mb.subscribe(OO.EVENTS.PLAYER_CREATED, _eventnamespace, onPlayerCreated);
   
}

function initPlayer(data){
    let params = {
        'autoplay': false,
        'loop': false,
        debug: false,
        onCreate : _onCreate
    };

    if (data.params["embedToken"] !== undefined) {
        params["embedToken"] = data.params["embedToken"];
    }

    OO.ready(function(){
        window.pp = OO.Player.create(
            'player', // element id
            data.ec, // Embed code
            params
        )
    });
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