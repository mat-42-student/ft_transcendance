import * as THREE from 'three';
import LevelBase from '../game3d/gameobjects/levels/LevelBase.js';
import { state, chooseHeader } from '../main.js';


export class GameBase {

	constructor() {
		this.side = 2;
		/**
		 * Duplicate reference of state.engine.scene most of the time,
		 * except while this.level is loading (in which case, state.engine.scene is null).
		 * @type {LevelBase} */
		this.level = null;
		this.ballPosition = new THREE.Vector2(0, 0);
		this.scores = [0, 0];
		this.paddlePositions = [0, 0];
		this.paddleHeights = [0, 0];
        this.playerNames = ['-', '-'];
		state.engine.scene = null;
	}

	frame(delta, time) {
		// it stops working if i delete this and i will not question it.
	}

	close(youCancelled) {
		if (state.gameApp == this)  { state.gameApp = null; }
		chooseHeader('default');
		if (state.engine.scene == this)  { state.engine.scene = null; }
	}

}
