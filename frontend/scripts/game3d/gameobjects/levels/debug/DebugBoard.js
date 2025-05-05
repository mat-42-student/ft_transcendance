import { state } from "../../../../main.js";
import * as THREE from 'three';


export default class DebugBoard extends THREE.Box3Helper {

	box = new THREE.Box3();

	name = 'Debug Board';


	constructor() {
		super(null, new THREE.Color('#ffffff'));
	}


	onFrame(delta, time) {
		this.visible = state.isPlaying;
		if (this.visible) {
			this.box.setFromCenterAndSize(
				new THREE.Vector3(),
				new THREE.Vector3(
					state.gameApp.level.boardSize.x,
					0,
					state.gameApp.level.boardSize.y),
			);
		}
	}


	dispose() {
		super.dispose();
	}
}
