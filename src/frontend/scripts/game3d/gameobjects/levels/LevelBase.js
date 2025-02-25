import * as THREE from 'three';
import { state } from "../../../main.js";
import SmoothCamera from '../camera/SmoothCamera.js';


export default class LevelBase extends THREE.Scene {

	camera = new SmoothCamera();

	/** @type {CameraStats[]} */
	cameras;
	boardSize = new THREE.Vector2(1, 1);



	onFrame(delta, time) {
		// Automatic camera switching

		const selectedCamera = this.cameras[state.isPlaying ? state.gameApp.side : 0];

		state.engine.cameraTarget.position.copy(selectedCamera.position);
		state.engine.cameraTarget.quaternion.copy(selectedCamera.quaternion);
		state.engine.cameraTarget.fov = selectedCamera.fov;
	}


	static CameraStats = class {
		position = new THREE.Vector3();
		quaternion = new THREE.Quaternion();
		fov = NaN;
	};
}
