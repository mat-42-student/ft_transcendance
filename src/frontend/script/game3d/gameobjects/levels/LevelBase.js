import * as THREE from 'three';
import global from 'global';
import engine from 'engine';


export default class LevelBase {

	/** @type {CameraStats[]} */
	cameras;

	/** @type {number} */
	boardDiagonal;


	onFrame(delta, time) {
		{  // Automatic camera switching
			const idx = global.game.focusedPlayerIndex >= 0 ? global.game.focusedPlayerIndex : 2;
			const selectedCamera = this.cameras[idx];

			engine.cameraTarget.position.copy(selectedCamera.position);
			engine.cameraTarget.quaternion.copy(selectedCamera.quaternion);
			engine.cameraTarget.fov = selectedCamera.fov;
		}
	}


	/** Override this */
	dispose() {}


	static CameraStats = class {
		/** @type {THREE.Vector3} */
		position;
		/** @type {THREE.Quaternion} */
		quaternion;
		/** @type {number} */
		fov;

		clone() {
			const obj = new LevelBase.CameraStats();
			obj.position = this.position.clone();
			obj.quaternion = this.quaternion.clone();
			obj.fov = this.fov;
			return obj;
		}
	};
}
