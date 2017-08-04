
cast.player.api.setLoggerLevel(cast.player.api.LoggerLevel.DEBUG);
cast.receiver.logger.setLevelValue(cast.receiver.LoggerLevel.DEBUG);



videoEl = document.getElementById('player');
crm = cast.receiver.CastReceiverManager.getInstance();
//mediaManager = new cast.receiver.MediaManager(videoEl)
crm.start();

crm.onReady = (event) => {
    let capabilities = crm.getDeviceCapabilities();
    console.log(capabilities);
}
