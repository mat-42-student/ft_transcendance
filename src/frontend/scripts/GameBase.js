import * as THREE from 'three';
import LevelBase from './game3d/gameobjects/levels/LevelBase.js';


export class GameBase {

	constructor() {
		this.side = 2;
		/** @type {LevelBase} */ this.level = null;
		this.ballPosition = new THREE.Vector2(0, 0);
		this.scores = [0, 0];
		this.paddlePositions = [0, 0];
		this.paddleHeights = [0, 0];
		this.playerNames = ['Uninitialized', 'Uninitialized'];
		/** Set to true when done loading. Should correspond to when the game scene is shown on screen. */
		this.isPlaying = false;
	}

	frame(delta, time) {
        this.level.onFrame(delta, time);
	}

	close() {
		if (this.level) this.level.dispose();
		this.isPlaying = false;  // just in case this object lingers somehow?
	}

}
