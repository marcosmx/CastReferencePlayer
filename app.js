

//set log level
cast.receiver.logger.setLevelValue(cast.receiver.LoggerLevel.DEBUG);

element_ = document.getElementById('video');

mediaManager = new cast.receiver.MediaManager(element_);

////media Manager stuff

mediaManager.onLoad = function(event){
    let data = event.data.media.customData;
    // TODO: Handle loading Screen
    
    initPlayer(data);
    mediaManager.sendStatus(event.senderId, event.data.requestId, true);
}

function initPlayer(data){
    let params = {
        'autoplay': true,
        'loop': false
    };

    if (data.params["embedToken"] !== undefined) {
        params["embedToken"] = data.params["embedToken"];
    }

    OO.ready(function(){
        window.pp = OO.Player.create(
            'media', // element id
            data.ec, // Embed code
            params
        )
    });
}


castManager = cast.receiver.CastReceiverManager.getInstance();

castManager.start();