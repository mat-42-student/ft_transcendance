import * as THREE from 'three';
import { state } from '../../../../main.js';
import Paddle from '../../../gameobjects/gameplay/Paddle.js';


export default class PingpongPaddle extends Paddle {

	constructor(playerIndex, model) {
		super(playerIndex);
		this.model = model;
	}


	onAdded() {
		this.add(this.model);
		this.model.position.x = 0.02;  // Ball diameter offset.
	}


	onFrame(delta, time) {
		super.onFrame(delta, time);

		if (this.visible) {
			// assumes 3d model is 1 units wide, to match correctly.
			this.model.scale.setScalar(state.gameApp.paddleHeights[this.playerIndex]);
		}
	}

}
