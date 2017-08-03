videoEl = document.getElementById('player');
receiverManger = cast.receiver.CastReceiverManager.getInstance();
mediaManager = new cast.receiver.MediaManager(videoEl)
receiverManger.start();

console.log(mediaManager, receiverManger);