import * as THREE from 'three';
import Ball from '../../gameplay/Ball.js';
import { state } from '../../../../main.js';
import { BALL_DIAMETER, bounceAnimationHeight } from './LevelPingpong.js';
import Cross2DHelper from '../../utils/Cross2DHelper.js';


export default class PingpongBall extends Ball {

	/**
	 * @param {THREE.Object3D} model
	 */
	constructor(model) {
		super();
		this.model = model;
	}


	onAdded() {
		this.add(this.model);

		this.shadow = new Cross2DHelper("#ffff00");  //TODO replace with a mesh
		this.shadow.position.y = -BALL_DIAMETER;  // glue to table surface
		this.shadow.position.y = 0.005;  // prevent Z fighting with table surface
		this.shadow.scale.setScalar(0.3);
		this.add(this.shadow);
	}


	onFrame(delta, time) {
		super.onFrame(delta, time);

		if (this.visible) {
			this.#spinAnimation();
			this.model.position.y = this.#bounceAnimation();
		}
	}


	#spinAnimation() {
		//TODO
	}


	#bounceAnimation() {
		// https://www.desmos.com/calculator/sznvwyvlle
		const BOUNCE_HEIGHT = bounceAnimationHeight;
		const BOARD_HALF_WIDTH = state.gameApp.level.boardSize.x / 2;
		const currentX = state.gameApp.ballPosition.x;
		return BOUNCE_HEIGHT * Math.abs(Math.cos((currentX * Math.PI) / BOARD_HALF_WIDTH));
	}

}
