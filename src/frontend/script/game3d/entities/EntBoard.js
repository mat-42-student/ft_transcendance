import * as THREE from 'three';
import Engine from '../Engine.js';
import Entity from '../Entity.js';


export default class EntBoard extends Entity {

	mesh;

	static isLoaded = false;
	static #material;
	static #geometry;


	/** @param {Engine} engine */
	constructor(engine) {
		super(engine);
		EntBoard.autoLoad();
	}


	onReady() {
		super.onReady();

		this.mesh = new THREE.Mesh(EntBoard.#geometry, EntBoard.#material);
		this.engine.scene3.add(this.mesh);
	}

	onFrame(delta, time) {
		this.mesh.scale.x = this.engine.state.arenaSize.x;
		this.mesh.scale.y = this.engine.state.arenaSize.y;
	}


	onDestroy() {
		super.onDestroy();

		this.engine.scene3.remove(this.mesh);
	}


	static onLoad() {
		super.onLoad();

		EntBoard.#material = new THREE.MeshBasicMaterial({color: "#ffffff"});
		EntBoard.#material.transparent = true;
		EntBoard.#material.opacity = 0.1;
		EntBoard.#geometry = new THREE.PlaneGeometry(1,1,1,1);
	}

	static onUnload() {
		super.onUnload();

		EntBoard.#material.dispose();
		EntBoard.#material = null;

		EntBoard.#geometry.dispose();
		EntBoard.#geometry = null;
	}
}