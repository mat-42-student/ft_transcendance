import * as THREE from 'three';
import Engine from '../Engine.js';
import Entity from '../Entity.js';


export default class EntBall extends Entity {

	mesh;

	static isLoaded = false;
	static #material;
	static #geometry;


	/** @param {Engine} engine */
	constructor(engine) {
		super(engine);
		EntBall.autoLoad();
	}


	onReady() {
		super.onReady();

		this.mesh = new THREE.Mesh(EntBall.#geometry, EntBall.#material);
		this.engine.scene3.add(this.mesh);
	}


	onDestroy() {
		super.onDestroy();
		this.engine.scene3.remove(this.mesh);
	}


	static onLoad() {
		super.onLoad();

		EntBall.#material = new THREE.LineBasicMaterial({
			color: "#44aa44",
			linewidth: 3
		});
		EntBall.#geometry = new THREE.SphereGeometry(0.05,10,10);
	}

	static onUnload() {
		super.onUnload();

		EntBall.#material.dispose();
		EntBall.#material = null;

		EntBall.#geometry.dispose();
		EntBall.#geometry = null;
	}
}
