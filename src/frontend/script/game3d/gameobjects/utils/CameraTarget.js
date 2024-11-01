import * as THREE from 'three';
import engine from 'engine';
import * as GAMEOBJECTS from 'gameobjects';


export default class CameraTarget extends THREE.Object3D {

	/* Target values: */

	// Object3D position
	// Object3D rotation
	fov = 70;
	teleportNow = true;


	smoothSpeed = 1.0;
	mousePositionMultiplier = new THREE.Vector2(1, 1);
	mouseRotationMultiplier = new THREE.Vector2(90,90);
	/** Local space coordinates relative to this.transform */
	mouseRotationPivotPosition = new THREE.Vector3();

	dispose() {
	}
}
