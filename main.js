videoEl = document.getElementById('player');
crm = cast.receiver.CastReceiverManager.getInstance();
//mediaManager = new cast.receiver.MediaManager(videoEl)
crm.start();

crm.onReady = (event) => {
    let capabilities = crm.getDeviceCapabilities();
    console.log(capabilities);
}
