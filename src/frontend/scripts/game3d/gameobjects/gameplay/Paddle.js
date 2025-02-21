import * as THREE from 'three';
import { state } from '../../../main.js';


export default class Paddle extends THREE.Group {

	playerIndex = -1;


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
		this.position.x = state.gameApp.level.size.x / 2;
		this.position.x *= this.playerIndex == 0 ? 1 : -1;

		this.position.z = state.gameApp.paddlePositions[this.playerIndex];
	}
}
