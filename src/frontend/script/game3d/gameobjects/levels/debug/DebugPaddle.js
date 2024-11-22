import * as THREE from 'three';
import engine from 'engine';
import * as GAMEOBJECTS from 'gameobjects';
import global from 'global';


export default class DebugPaddle extends GAMEOBJECTS.GAMEPLAY.Paddle {

	#box3helper;


	constructor(playerIndex) {
		super(playerIndex);
		this.#box3helper = new THREE.Box3Helper(
			new THREE.Box3(),
			new THREE.Color('#3333dd')
		);
	}


	onAdded() {
		this.add(this.#box3helper);
	}


	onFrame(delta, time) {
		super.onFrame(delta, time);

		const halfHeight = global.game.paddleHeights[this.playerIndex] / 2;

		this.#box3helper.box.set(
			new THREE.Vector3(0, 0, -halfHeight),
			new THREE.Vector3(0, 0.05, halfHeight)
		);
	}


	dispose() {
		this.clear();
		this.#box3helper = null;
	}
}
