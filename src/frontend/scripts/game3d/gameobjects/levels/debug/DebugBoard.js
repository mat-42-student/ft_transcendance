import { state } from "../../../../main.js";
import * as THREE from 'three';


export default class DebugBoard extends THREE.Box3Helper {

	constructor() {
		super(null, new THREE.Color('#ffffff'));
		this.box = new THREE.Box3();
	}


	onFrame(delta, time) {
		this.visible = state.gameApp != null;
		if (this.visible) {
			this.box.setFromCenterAndSize(
				new THREE.Vector3(),
				new THREE.Vector3(state.gameApp.level.size.x, 0, state.gameApp.level.size.y),
			);
		}
	}


	dispose() {
		super.dispose();
	}
}
