import * as THREE from 'three';
import { state } from "../../../main.js";


export default class ScoreIndicator extends THREE.Group {

	playerIndex = NaN;

	#previousScore = 0;


	constructor(playerIndex) {
		super();

		if (playerIndex !== 0 && playerIndex !== 1) throw Error('Bad argument')
		this.playerIndex = playerIndex;

		this.name = 'Score Indicator ' + playerIndex;
	}


	onFrame(delta, time) {
		this.visible = state.isPlaying || this.freeze == true;
		if (this.visible && this.freeze != true) {
			const score = state.gameApp.scores[this.playerIndex];
			if (this.#previousScore != score) {
				this.#previousScore = score;
				this.scoreChanged(score);
			}
		}
	}


	scoreChanged(score) {
		// Override it.
		// Used for animations.
	}
}
