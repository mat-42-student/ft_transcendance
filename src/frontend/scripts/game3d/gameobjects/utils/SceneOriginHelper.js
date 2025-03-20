import * as THREE from 'three';
import { state } from '../../../main.js';


export default class SceneOriginHelper extends THREE.Group {

	/** @type {THREE.GridHelper} */
	#grid;

	/** @type {THREE.AxesHelper} */
	#axes;

	constructor() {
		super();
		this.name = 'SceneOriginHelper';
	}

	onAdded() {
		if (state.engine.DEBUG_MODE !== true) {
			return;
		}

		this.#grid = new THREE.GridHelper(1, 10,
			new THREE.Color("#555555"),
			new THREE.Color("#333333")
		);
		this.add(this.#grid);

		this.#axes = new THREE.AxesHelper(0.1);
		this.#axes.material.linewidth = 3;  // NOTE: this does nothing lmao
		this.add(this.#axes);

		// not bulletproof but hey better than nothing
		if (!this.position.equals(new THREE.Vector3(0,0,0))
			|| !this.rotation.equals(new THREE.Euler(0,0,0, 'XYZ'))) {
			throw Error("This object is intended to show the origin.");
		}
	}

	dispose() {
		this.clear();
		this.#grid = this.#axes = undefined;
	}
}
