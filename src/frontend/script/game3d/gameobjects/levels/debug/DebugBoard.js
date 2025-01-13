import global from 'global';
import * as THREE from 'three';


export default class DebugBoard extends THREE.Box3Helper {

	constructor() {
		super(null, new THREE.Color('#ffffff'));
		this.box = new THREE.Box3();
	}


	onFrame(delta, time) {
		this.box.setFromCenterAndSize(
			new THREE.Vector3(),
			new THREE.Vector3(global.game.boardSize.x, 0, global.game.boardSize.y),
		);
	}


	dispose() {
		super.dispose();
	}
}
