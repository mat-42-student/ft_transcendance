import * as THREE from 'three';
import { state } from '../../../../main.js';
import Paddle from '../../../gameobjects/gameplay/Paddle.js';
import { BALL_DIAMETER, BOUNCE_ANIMATION_HEIGHT } from './LevelPingpong.js';
import Cross2DHelper from '../../utils/Cross2DHelper.js';


export default class PingpongPaddle extends Paddle {

	constructor(playerIndex, model) {
		super(playerIndex);
		this.model = model;
	}


	onAdded() {
		this.position.y = BOUNCE_ANIMATION_HEIGHT;

		this.model.position.x = BALL_DIAMETER;
		this.add(this.model);

		this.shadow = new Cross2DHelper("#ff0000");  //TODO replace with a mesh
		this.add(this.shadow);
		this.shadow.position.y = (
			this.shadow.worldToLocal(new THREE.Vector3()).y
			+ 0.005  // prevent Z fighting
			- BALL_DIAMETER  // table surface is below origin
		);
	}


	onFrame(delta, time) {
		super.onFrame(delta, time);

		if (this.visible) {
			// assumes 3d model is 1 units wide, to match correctly.
			this.model.scale.setScalar(state.gameApp.paddleHeights[this.playerIndex]);
		}
	}

}
