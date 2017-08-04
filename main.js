cast
    .player
    .api
    .setLoggerLevel(cast.player.api.LoggerLevel.DEBUG);
cast
    .receiver
    .logger
    .setLevelValue(cast.receiver.LoggerLevel.DEBUG);

videoEl = document.getElementById('player');
crm = cast
    .receiver
    .CastReceiverManager
    .getInstance();
//mediaManager = new cast.receiver.MediaManager(videoEl)
crm.start();

crm.onReady = (event) => {
    let capabilities = crm.getDeviceCapabilities();
    console.log("las caps ", capabilities);
}

crm.onSenderConnected = function (event) {
    senders = crm.getSenders();
    printDebugMessage("connected senders", senders);
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
