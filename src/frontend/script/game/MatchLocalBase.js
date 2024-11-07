import game from "game";
import MatchBase from "./MatchBase";


export default class MatchLocalBase extends MatchBase {

    constructor(localPlayerInfo) {
        super(localPlayerInfo);
    }


    startMatch() {
        super.startMatch();
    }


	onFrame(time) {
        super.onFrame(time);
    }


	stopPlaying() {
        super.stopPlaying();
    }
}
