import * as THREE from 'three';
import { state } from "../../../main.js";
import SmoothCamera from '../camera/SmoothCamera.js';


export default class LevelBase extends THREE.Scene {

	camera = new SmoothCamera();

	boardSize = new THREE.Vector2(1, 1);

	/** Null this to skip auto view selection, and set data directly on {@link camera}. */
	views = {
		position: Array(3).fill(new THREE.Vector3()),
		quaternion: Array(3).fill(new THREE.Quaternion()),
		fov: [NaN, NaN, NaN],
	};


	onFrame(delta, time) {
		if (this.views != null) {
			const camIdx = state.isPlaying ? state.gameApp.side : 2;

			this.camera.position.copy(views.position[camIdx]);
			this.camera.quaternion.copy(views.quaternion[camIdx]);
			this.camera.fov = views.fov[camIdx];
		}
	}

}
