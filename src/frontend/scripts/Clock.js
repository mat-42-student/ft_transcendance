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
		try {
			const delta = this.#clock.getDelta();

			if (state) {
				if (state.gameApp) {
					state.gameApp.frame(delta, time)
				}
				if (state.engine) {
					state.engine.render(delta, time);
				}
			}
		} catch (error) {
			console.error('Clock.frame(): Failed to do work.');
		}

		requestAnimationFrame(this.#frameCallback);
	}

}