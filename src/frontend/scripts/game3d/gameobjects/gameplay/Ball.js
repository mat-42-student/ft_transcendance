import * as THREE from 'three';
import { state } from '../../../main.js';


export default class Ball extends THREE.Group {

	velocity = new THREE.Vector2(0, 0);


	constructor() {
		super();

		this.name = 'Ball';
	}


	onFrame(delta, time) {
		this.visible = state.isPlaying;
		if (this.visible) {
			this.position.x = state.gameApp.ballPosition.x;
			this.position.z = state.gameApp.ballPosition.y;

			if (this.#previousPosition instanceof THREE.Vector2 && delta > 0) {
				this.velocity.copy(state.gameApp.ballPosition)
					.sub(this.#previousPosition)
					.divideScalar(delta);
			} else {
				this.velocity.set(0, 0);
			}

			this.#previousPosition = state.gameApp.ballPosition.clone();
		} else {
			this.velocity.set(0, 0);
			this.#previousPosition = null;
		}
	}


	/** @type {THREE.Vector2?} */
	#previousPosition = null;

}
