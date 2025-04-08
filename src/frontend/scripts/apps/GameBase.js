import * as THREE from 'three';
import LevelBase from '../game3d/gameobjects/levels/LevelBase.js';
import { state, selectVisibleHeader } from '../main.js';


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
		this.playerNames = ['Uninitialized', 'Uninitialized'];
		state.engine.scene = null;
	}

	frame(delta, time) {
		if (this.level && state.engine.scene)
			this.level.onFrame(delta, time);
	}

	close(youCancelled) {
		if (state.gameApp == this)  { state.gameApp = null; }
		selectVisibleHeader(false);
		if (state.engine.scene == this)  { state.engine.scene = null; }
	}

}
