import * as THREE from 'three';
import { state } from "../../../main.js";
import engine from '../../engine.js';


export default class LevelBase {

	/** @type {CameraStats[]} */
	cameras;

	size = new THREE.Vector2(1, 1);


	onFrame(delta, time) {
		{  // Automatic camera switching
			const selectedCamera = this.cameras[state.gameApp.side];

			engine.cameraTarget.position.copy(selectedCamera.position);
			engine.cameraTarget.quaternion.copy(selectedCamera.quaternion);
			engine.cameraTarget.fov = selectedCamera.fov;
		}
	}


	/** Override this */
	dispose() {}


	static CameraStats = class {
		position = new THREE.Vector3();
		quaternion = new THREE.Quaternion();
		fov = NaN;
	};
}
