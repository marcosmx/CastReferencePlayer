

//set log level
cast.receiver.logger.setLevelValue(cast.receiver.LoggerLevel.DEBUG);

element_ = document.getElementById('video');

mediaManager = new cast.receiver.MediaManager(element_);

castManager = cast.receiver.CastReceiverManager.getInstance();

castManager.start();