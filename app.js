

//set log level
cast.receiver.logger.setLevelValue(cast.receiver.LoggerLevel.DEBUG);

element_ = document.getElementById('temp-video');

mediaManager = new cast.receiver.MediaManager(element_);

////media Manager stuff

mediaManager.onLoad = function(event){
    let data = event.data.media.customData;
    // TODO: Handle loading Screen
    
    initPlayer(data);
    mediaManager.sendStatus(event.senderId, event.data.requestId, true);
    element_.remove();
}

function _onCreate(player){
    player.mb.subscribe("*", "marco-example", function(e){
        console.log(e);
    })
}

function initPlayer(data){
    let params = {
        'autoplay': true,
        'loop': false,
        debug: true,
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
    //initPlayer();
}

castManager.onSenderConnected = function (event) {
    senders = crm.getSenders();
    console.log("connected senders", senders);
}

castManager.onSenderDisconnected = function (event) {
    senders = crm.getSenders();
    // if the last sender disconnects, then stop the cast session entirely if it was
    // an explicit disconnection
    if ((senders.length === 0) && (event.reason == cast.receiver.system.DisconnectReason.REQUESTED_BY_SENDER)) {
        crm.stop();
    }
}

castManager.onShutdown = function (event) {
    senders = crm.getSenders();
    console.log(senders);
}

castManager.start();