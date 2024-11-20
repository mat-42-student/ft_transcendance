import * as THREE from 'three';
import engine from 'engine';
import * as GAMEOBJECTS from 'gameobjects';


export default class DebugBall extends GAMEOBJECTS.GAMEPLAY.Ball {

	/** @type {GAMEOBJECTS.UTILS.Cross2DHelper} */
	#helper;


	onAdded() {
		this.#helper = new GAMEOBJECTS.UTILS.Cross2DHelper("#33aa33");
		this.#helper.rotateOnAxis(
			new THREE.Vector3(0,1,0),
			THREE.MathUtils.degToRad(45)
		);
		this.#helper.scale.set(0.1, 0.1, 0.1);
		this.add(this.#helper);
	}


	dispose() {
		if (this.#helper != undefined) {
			this.remove(this.#helper);
			this.#helper = undefined;
		}
	}
}
