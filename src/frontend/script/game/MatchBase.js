import game from "game";


export default class MatchBase {

    constructor(localPlayerInfo) {
        game.usernames[0] = localPlayerInfo.name;
    }


    startMatch() {
    }


	onFrame(time) {
    }


	stopPlaying() {
    }
}
