class Player {
    constructor(){
        console.log("a new instance of Player");
        console.log(arguments);
    }

    load(contentId, autoplay, opt_time, opt_tracksInfo, opt_onlyLoadTracks){
        console.log("attempt to load method")
        console.log(contentId, autoplay, opt_time, opt_tracksInfo, opt_onlyLoadTracks)
    }

    play(){
        console.log("attempt to play")
    }

    stop(){
        console.log("attempt to stop")
    }

    getState(){
        console.log("attempt to get State")
    }
}

export default Player


//LOAD, PLAY, STOP, GET_STATUS