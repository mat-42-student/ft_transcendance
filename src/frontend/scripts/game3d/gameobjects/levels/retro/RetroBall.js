import * as THREE from 'three';
import Ball from '../../gameplay/Ball.js';


export default class RetroBall extends Ball {

	constructor(material) {
		super();
		this.#material = material;
	}

	onAdded() {
		this.#geo = new THREE.BoxGeometry(0.02, 0, 0.02);
		this.#cubeMesh = new THREE.Mesh(this.#geo, this.#material);
		this.add(this.#cubeMesh);
	}

	dispose() {
		if (this.#geo)  this.#geo.dispose();
	}

	#cubeMesh;
	#geo;
	#material;

}
