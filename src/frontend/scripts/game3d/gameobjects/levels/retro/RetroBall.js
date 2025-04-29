import * as THREE from 'three';
import Ball from '../../gameplay/Ball.js';


export default class RetroBall extends Ball {

	constructor(material, computer) {
		super();
		this.#material = material;
		this.computer = computer;
	}

	onAdded() {
		this.#geo = new THREE.BoxGeometry(0.02, 0, 0.02);
		this.#cubeMesh = new THREE.Mesh(this.#geo, this.#material);
		this.add(this.#cubeMesh);
	}

	onFrame(delta, time) {
		super.onFrame(delta, time);

		if (this.visible) {
			this.#cubeMesh.visible = this.velocity.lengthSq() < 0.01 ? this.computer.getBlink() : true;
		}
	}

	dispose() {
		if (this.#geo)  this.#geo.dispose();
	}

	#cubeMesh;
	#geo;
	#material;

}
