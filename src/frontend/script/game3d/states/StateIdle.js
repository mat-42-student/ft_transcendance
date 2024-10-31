import * as THREE from 'three';
import StateBase from './StateBase.js'
import StateInGame from './StateInGame.js'


export default class StateIdle extends StateBase {
	#level = 'No level';


	/** @param {StateBase} previousState  */
	constructor(previousState) {
		super();
		if (previousState instanceof StateInGame) {
			this.#level = previousState.level;
		}
	}


	enterState(engine) {
		console.log('Idle, level:', this.#level);
		engine.scene3.background = new THREE.Color(0.2,0.2,0.6);
	}


	exitState(engine) {
	}
}
