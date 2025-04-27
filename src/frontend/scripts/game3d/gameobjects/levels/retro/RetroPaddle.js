import * as THREE from 'three';
import { state } from '../../../../main.js';
import Paddle from '../../../gameobjects/gameplay/Paddle.js';

export default class RetroPaddle extends Paddle {

	constructor(playerIndex, material) {
		super(playerIndex);
		this.#material = material;
	}

	onAdded() {
		this.#geo = new THREE.BoxGeometry(0.02, 0, 1);
		this.#mesh = new THREE.Mesh(this.#geo, this.#material);
		this.add(this.#mesh);
		this.#mesh.position.x = 0.02;
	}

	onFrame(delta, time) {
		super.onFrame(delta, time);

		if (this.visible) {
			this.#mesh.scale.z = state.gameApp.paddleHeights[this.playerIndex];
		}
	}

	dispose() {
		if (this.#geo)  this.#geo.dispose();
	}

	/** @type {THREE.Mesh} */
	#mesh;
	#geo;
	#material;

}
