/*var playerCtrl = (function (OO) {
    var _player = null;
    var _playHeadInfo = {};
    var _currentAsset = null;

    //utils

    function _getVideoEl(elementId) {
        var el = document.querySelector(`#${elementId} video`) || document.querySelector(`#${elementId}`);
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
        _playerEl = null;
        _playerEl = _getVideoEl(data.domId);
        if (_playerEl) {
            mediaManager.setMediaElement(_playerEl);
        }
    }

    function _onPlayheadTimeChanged() {
        _playHeadInfo = [...arguments];
        //console.log("playhead time changed: ", _playHeadInfo);
    }

    function _onInitialPlay(e){
        console.log("player ctrl: init playback ", e);
        _messageBus.broadcast(JSON.stringify({0:"playing"}));
    }

    function _onPause() {
        _player.mb.publish(OO.EVENTS.PAUSE);
    }

    function _onPaused(e) {
        var message = Object.assign({}, e); // flatten the object and just keep direct properties
        _messageBus.broadcast(JSON.stringify(message));
    }

    function _onStop(){
        _player.mb.publish(OO.EVENTS.PLAYED, {type:"stop"});
    }

    function _onCreate(player) {
        //player.mb.subscribe(OO.EVENTS.VC_VIDEO_ELEMENT_CREATED, _eventnamespace, _onVcCreatedElement);
        player.mb.subscribe(OO.EVENTS.PLAYER_CREATED, _eventnamespace, _onPlayerCreated);
        player.mb.subscribe(OO.EVENTS.PLAYHEAD_TIME_CHANGED, _eventnamespace, _onPlayheadTimeChanged);
        player.mb.subscribe(OO.EVENTS.INITIAL_PLAY, _eventnamespace, _onInitialPlay);
        player.mb.subscribe(OO.EVENTS.PAUSED, _eventnamespace, _onPaused);       

    }

    function _initPlayer(data) {
        var params = Object.assign({}, data.params);
        params.onCreate = _onCreate;
        //data.ec = "JpeWNhbjrfKs0sIelRvR8R3YIEATk1ZG";
        //params.embedToken = "http://player.ooyala.com/sas/embed_token/lhNmYyOuUnCvRiHi5NbFBBLOG4xm/A2MGFyYTE6Dv_7o2E3zWqCcYAUyqO4t9?api_key=lhNmYyOuUnCvRiHi5NbFBBLOG4xm.S9VRE&expires=3042186829&&&&signature=AgkvXZW57DrxsLDdOiVEBWqkWPxxz75olqZfS505CeU";
        //var extra = {"api_ssl_server":"https://player-staging.ooyala.com","api_server":"http://player-staging.ooyala.com","auth_ssl_server":"https://player-staging.ooyala.com/sas","auth_server":"http://player-staging.ooyala.com/sas"};
        //Object.assign(params, extra);

        _currentAsset = data.ec;
        if (_player === null) {
            console.log("player ctrl: about to create a new player instance", params);
            OO.ready(function () {
                _player = OO.Player.create('player', data.ec, params);
            });
        } else{
            console.log("player ctrl: set new embed code: ", data.ec)
            _player.setEmbedCode(data.ec, params);
        }        
    }

    return {
        setPlayer: _initPlayer,
        getState: function() {
            return _player.getState();
        },
        getPlayHead: ()=>(_playHeadInfo),
        getCurrentAsset: ()=>(_currentAsset),
        stop: _onStop,
        pause: _onPause
    };
})(OO);*/