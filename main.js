
cast.player.api.setLoggerLevel(cast.player.api.LoggerLevel.DEBUG);
cast.receiver.logger.setLevelValue(cast.receiver.LoggerLevel.DEBUG);

videoEl = document.getElementById('player-temp');
////// media manager stuff
mediaManager = new cast.receiver.MediaManager(videoEl);

crm = cast.receiver.CastReceiverManager.getInstance();



function onGetStatus(event) {
    console.log("Thaaaa event status: ", event);
    //event.data = { customData: { debug: debug } } // to make sure it will be printed with Chromecast-debug tag
    //printDebugMessage("onGetStatus", event);
    mediaManager.sendStatus(event.senderId, event.data.requestId, true);
  }

function onLoad(event){
    console.log(event);
}

//mediaManager.onLoad = onLoad.bind(this);
mediaManager.onGetStatus = onGetStatus.bind(this);

//////end media manager

castMB = crm.getCastMessageBus("urn:x-cast:ooyala");

castMB.onMessage = function(evt) {
    console.log("message bus", evt);
    var data =  JSON.parse(evt.data);

    if (data.action == 'play'){
        pp.play();
    }
};

crm.start();



crm.onReady = (event) => {
    //let capabilities = crm.getDeviceCapabilities();
    //console.log("las caps ", capabilities);
    //initPlayer();
}

crm.onSenderConnected = function (event) {
    senders = crm.getSenders();
    console.log("connected senders", senders);
}

crm.onSenderDisconnected = function (event) {
    senders = crm.getSenders();
    // if the last sender disconnects, then stop the cast session entirely if it was
    // an explicit disconnection
    if ((senders.length === 0) && (event.reason == cast.receiver.system.DisconnectReason.REQUESTED_BY_SENDER)) {
        crm.stop();
    }
}

crm.onShutdown = function (event) {
    senders = crm.getSenders();
    console.log(senders);
}

function initPlayer() {

    var playerParam = {
        'autoplay': false,
        'loop': false
    };

    OO.ready(function () {
        window.pp = OO
            .Player
            .create('player', 'lwczIzYjE6xi7LKQEvVMRbY2LlnCSSR7', playerParam);
    });
}
