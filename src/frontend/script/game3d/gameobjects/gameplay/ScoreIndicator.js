import global from 'global';
import * as THREE from 'three';


export default class ScoreIndicator extends THREE.Group {

	playerIndex = -1;

	#previousScore = 0;


	constructor(playerIndex) {
		super();

		if (playerIndex !== 0 && playerIndex !== 1) throw Error('Bad argument')
		this.playerIndex = playerIndex;

		this.name = 'Score Indicator ' + playerIndex;
	}


	onFrame(delta, time) {
		const score = global.game.scores[this.playerIndex];
		if (this.#previousScore != score) {
			this.#previousScore = score;
			this.scoreChanged(score);
		}
	}


	scoreChanged(score) {
		// Override it.
		// Used for animations.
	}
}
