import { state } from "./main.js";
import * as THREE from 'three';


export class GameBase {

	constructor() {
		this.side = 2;
		this.level = null;
		this.ballPosition = new THREE.Vector2(0, 0);
		this.scores = [0, 0];
		this.paddlePositions = [0, 0];
		this.paddleHeights = [0, 0];
		this.playerNames = ['Uninitialized', 'Uninitialized'];
	}

	frame(delta, time) {
        this.level.onFrame(delta, time);
	}

	close() {
		if (this.level) this.level.dispose();
	}

}
