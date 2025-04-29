import * as THREE from 'three';
import { state } from '../../../main.js';


export default class Paddle extends THREE.Group {

	constructor(playerIndex) {
		super();

		this.name = 'Paddle ' + String(playerIndex);

		if (playerIndex !== 0 && playerIndex !== 1)  throw Error('Bad argument');
		this.playerIndex = playerIndex;

		if (playerIndex === 1) {
			this.rotateY(THREE.MathUtils.degToRad((180)));
		}
	}


	onFrame(delta, time) {
		this.visible = state.isPlaying;
		if (this.visible) {
			this.position.x = (state.gameApp.level.boardSize.x / 2) * (this.playerIndex == 0 ? 1 : -1);
			this.position.z = state.gameApp.paddlePositions[this.playerIndex];
		}
	}
}
