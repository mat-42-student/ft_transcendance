import * as THREE from 'three';
import engine from 'engine';
import * as GAMEOBJECTS from 'gameobjects';


export default class CameraTarget {

	/* Target values */

    position = new Vector3();
    rotation = new Euler();
	fov = 70;

	topMarginPx = 100;
	rightMarginPx = 100;
	leftMarginPx = 100;
	bottomMarginPx = 100;


	/* Smooth interpolation */

	teleportNow = true;
	smoothSpeed = 1.0;


	/* Mouse perspective */

	mousePositionMultiplier = new THREE.Vector2(1, 1);
	mouseRotationMultiplier = new THREE.Vector2(90,90);
	/** Local space coordinates relative to this.transform */
	mouseRotationPivotPosition = new THREE.Vector3();


	#current = {
		pos: new THREE.Vector3(),
		rot: new THREE.Euler(),
		fov: 70,
	}

	//TODO call this in engine.js
	onFrame(delta, affectedCamera, renderSize) {
		if (this.teleportNow || true) {  //TODO smoothing
			this.teleportNow = false;
			this.#current.pos = this.position;
			this.#current.rot = this.rotation;
			this.#current.fov = this.fov;
		} else {
			throw "TODO- camera smoothing"
		}

		affectedCamera.position = this.#current.pos;
		affectedCamera.rotation = this.#current.rot;
		affectedCamera.fov = this.#current.fov;

		// Margin calculation
		const o = this.#current.offset;
		affectedCamera.setViewOffset(
			// o.
		);
	}
}
//TODO add CameraHelper somewhere so that the border of the 'real' camera is visible
