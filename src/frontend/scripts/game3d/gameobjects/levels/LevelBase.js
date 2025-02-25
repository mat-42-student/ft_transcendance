import * as THREE from 'three';
import { state } from "../../../main.js";
import SmoothCamera from '../camera/SmoothCamera.js';


export default class LevelBase extends THREE.Scene {

	/** @type {SmoothCamera} */
	smoothCamera;

	boardSize = new THREE.Vector2(1, 1);

	/** Null this to skip auto view selection, and set data directly on {@link smoothCamera}. */
	views = {
		position: Array(3).fill(new THREE.Vector3()),
		quaternion: Array(3).fill(new THREE.Quaternion()),
		fov: [NaN, NaN, NaN],
	};


	onAdded() {
		this.smoothCamera = new SmoothCamera();
		this.add(this.smoothCamera);
	}


	onFrame(delta, time) {
		if (this.views != null) {
			const camIdx = state.isPlaying ? state.gameApp.side : 2;

			this.smoothCamera.position.copy(this.views.position[camIdx]);
			this.smoothCamera.quaternion.copy(this.views.quaternion[camIdx]);
			this.smoothCamera.fov = this.views.fov[camIdx];
		}
	}

}
