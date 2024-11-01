import * as THREE from 'three';
import Engine from '../Engine.js';
import Entity from '../Entity.js';


export default class EntPaddle extends Entity {

	mesh;
	#arrow;

	static isLoaded = false;
	static #material;
	static #geometry;


	/** @param {Engine} engine */
	constructor(engine) {
		super(engine);
		EntPaddle.autoLoad();
	}


	onReady() {
		super.onReady();

		this.mesh = new THREE.Mesh(EntPaddle.#geometry, EntPaddle.#material);
		this.engine.scene3.add(this.mesh);
		
		this.#arrow = new THREE.ArrowHelper(
			new THREE.Vector3(1, 0, 0),
			new THREE.Vector3(0,0,0),
			1,
			// EntPaddle.#material.color
			0xffffff
		);
		this.mesh.add(this.#arrow);
		this.mesh.scale.x = this.mesh.scale.z = 0.1;
	}


	onDestroy() {
		super.onDestroy();

		this.engine.scene3.remove(this.mesh);
		this.engine.scene3.remove(this.#arrow);
	}


	static onLoad() {
		super.onLoad();

		EntPaddle.#material = new THREE.MeshBasicMaterial({color: 0xaa0000});
		EntPaddle.#geometry = new THREE.BoxGeometry(1,1,1);
		EntPaddle.#geometry.translate(-0.5, 0, 0);
	}

	static onUnload() {
		super.onUnload();

		EntPaddle.#material.dispose();
		EntPaddle.#material = null;

		EntPaddle.#geometry.dispose();
		EntPaddle.#geometry = null;
	}
}
