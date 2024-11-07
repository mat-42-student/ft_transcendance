import game from "game";
import * as GAMEOBJECTS from "gameobjects";
import MatchBase from "./MatchBase.js";


export default class MatchLocalBase extends MatchBase {

    constructor(params) {
        super(params);

        game.level = MatchLocalBase.chooseRandomLevel();
        game.boardDiagonal = game.level.BOARD_DIAGONAL;

        game.ballPosition = {x: 0, y: 0};
        game.paddlePositions = [0,0];
        game.paddleHeights = [0.2, 0.2];
        game.scores = [0,0];

        game.paddleSpeeds = [1,1];
    }


    startMatch() {
        super.startMatch();
    }


	onFrame(delta, time) {
        super.onFrame(delta, time);
        this.canPlayersMove = true;  //TODO
        if (this.canPlayersMove === true) {
            this.movePlayer(0);
        }
    }


	stopPlaying() {
        super.stopPlaying();
    }


    static chooseRandomLevel() {
        var keys = Object.keys(GAMEOBJECTS.LEVELS);
        return GAMEOBJECTS.LEVELS[keys[ keys.length * Math.random() << 0]];
    }


    movePlayer(playerIndex, delta) {
        const keycodes = this.playerKeys[playerIndex];
        let input = 0;
        if (this.keyCodes.has(keycodes.positive)) input += 1;
        if (this.keyCodes.has(keycodes.negative)) input -= 1;
        game.paddlePositions[playerIndex] += delta * input * game.paddleSpeeds[playerIndex];
    }
}
