import { state } from './main.js';
import * as THREE from 'three';


export class Clock {

	constructor() {
		requestAnimationFrame(this.#frameCallback);
	}


	#clock = new THREE.Clock(true);
	#frameCallback = this.#frame.bind(this);

	/**
	 * Intended to be called by requestAnimationFrame.
	 * @param {DOMHighResTimeStamp} time
	 */
	#frame(time) {
		const delta = this.#clock.getDelta();

		if (state) {
			if (state.gameApp) {
				state.gameApp.frame(delta, time)
			}
			if (state.engine) {
				state.engine.render(delta, time);
			}
		}

		requestAnimationFrame(this.#frameCallback);
	}

}