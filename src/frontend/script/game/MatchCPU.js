import game from "game";
import MatchLocalBase from "./MatchLocalBase.js";


export default class MatchCPU extends MatchLocalBase {

    constructor(params) {
        super(params);
        game.usernames[1] = MatchCPU.#generateRandomNick();
    }


    startMatch() {
        super.startMatch();
    }


	onFrame(delta, time) {
        super.onFrame(delta, time);
        if (this.canPlayersMove === true) {
            this.movePlayer(1);
        }
    }


	stopPlaying() {
        super.stopPlaying();
    }


    static #generateRandomNick() {
        const adjectives = ["Shadow", "Steady", "Mighty", "Funny", "Hidden", "Normal"];
        const nouns = ["Ficus", "Pidgin", "Rock", "Pillow", "Curtains", "Hobo"];

        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

        return '[BOT] ' + randomAdj + randomNoun + Math.floor(Math.random() * 1000);
    }
}
