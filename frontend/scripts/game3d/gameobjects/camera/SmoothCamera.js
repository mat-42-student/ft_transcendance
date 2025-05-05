import * as THREE from 'three';
import { state } from '../../../main.js';
import * as UTILS from '../../../utils.js';
import { SmoothCameraVisualizer } from './SmoothCameraVisualizer.js';


export default class SmoothCamera extends THREE.Object3D {

	/* Target values */
    // position;
    // quaternion;
	fov = 70;
	diagonal = 30;

	/* Smooth interpolation */
	teleportNow = true;
	/** Must be positive, higher number = faster. */
	smoothSpeed = 10;

	/* Mouse perspective */
	mousePositionMultiplier = new THREE.Vector2(1, 1);
	mouseRotationMultiplier = new THREE.Vector2(1,1);

	get camera() { return this.#CAMERA; }

	name = 'Smooth Camera';

	mousePos = new THREE.Vector2();


	#smooth = {
		position: this.position.clone(),
		quaternion: this.quaternion.clone(),
		fov: this.fov,
		diagonal: this.diagonal,
	}
	#CAMERA = new THREE.PerspectiveCamera();


	onAdded() {
		this.vis3d = new SmoothCameraVisualizer(this);
		this.add(this.vis3d);
	}


	onFrame(delta, time) {
		this.canvasSize = new THREE.Vector2(
			state.engine.renderer.domElement.clientWidth,
			state.engine.renderer.domElement.clientHeight
		);

		const mouseOffsets = this.#onFrame_updateMouse();
		const targetPos = this.position.clone().add(mouseOffsets.position);
		const targetRot = this.quaternion.clone().multiply(mouseOffsets.quaternion);

		if (this.teleportNow) {
			this.teleportNow = false;

			this.#smooth.position.copy(targetPos);
			this.#smooth.quaternion.copy(targetRot);
			this.#smooth.fov = this.fov;
			this.#smooth.diagonal = this.diagonal;
		} else {
			this.#smooth.position = UTILS.damp(this.#smooth.position, targetPos,
				this.smoothSpeed, delta);
			this.#smooth.quaternion = UTILS.damp(this.#smooth.quaternion, targetRot,
				this.smoothSpeed, delta);
			this.#smooth.fov = UTILS.damp(this.#smooth.fov, this.fov,
				this.smoothSpeed, delta);
			this.#smooth.diagonal = UTILS.damp(this.#smooth.diagonal, this.diagonal,
				this.smoothSpeed, delta);
		}

		this.camera.position.copy(this.#smooth.position);
		this.camera.rotation.setFromQuaternion(this.#smooth.quaternion);
		this.camera.fov = this.#smooth.fov;

		this.#onFrame_cameraRefresh();
	}


	#onFrame_updateMouse() {
		if (state.input.isMouseInWindow) {
			this.mousePos.set(
				(state.input.mouseX / this.canvasSize.x) * 2 - 1,
				(state.input.mouseY / this.canvasSize.y) * 2 - 1
			);
		}

		const mouseOffsets = {};

		mouseOffsets.position = new THREE.Vector3(
			-this.mousePos.x * this.mousePositionMultiplier.x,
			this.mousePos.y * this.mousePositionMultiplier.y,
			0
		);
		mouseOffsets.position.applyQuaternion(this.quaternion);

		const rx = new THREE.Quaternion().setFromAxisAngle(
				new THREE.Vector3(0, 1, 0),
				-this.mousePos.x * this.mouseRotationMultiplier.x
			);
		const ry = new THREE.Quaternion().setFromAxisAngle(
			new THREE.Vector3(1, 0, 0),
			-this.mousePos.y * this.mouseRotationMultiplier.y
		);
		mouseOffsets.quaternion = new THREE.Quaternion()
			.multiply(rx)
			.multiply(ry);

		return mouseOffsets;
	}


	#onFrame_cameraRefresh() {
		try {
			const result = this.#onFrame_tryCalculateBorderAvoidance(this.canvasSize);
			this.camera.setViewOffset(
				this.canvasSize.x, this.canvasSize.y,
				result.corner.x, result.corner.y,
				result.subscreenSize.x, result.subscreenSize.y,
			);
			this.camera.updateProjectionMatrix();

			if (this.vis3d)
				this.vis3d.update(result.vAspectRatio);
		} catch (error) {
			// Fallback: just render fullscreen.
			console.warn('CameraTarget: Error during margin avoidance calculations:', error,
				'Falling back to simple fullscreen view, ignoring borders and aspect ratio.');
			this.camera.clearViewOffset();
			this.camera.updateProjectionMatrix();
			return;
		}
	}


	#onFrame_tryCalculateBorderAvoidance() {
		let result = {};

		const span = {
			x: state.engine.borders.right - state.engine.borders.left,
			y: state.engine.borders.bottom - state.engine.borders.top,
		};

		const unitRect = __unitRect(this.diagonal);
		const canvasAspectRatio = this.canvasSize.x / this.canvasSize.y;

		result.vAspectRatio = unitRect.x / unitRect.y;

		const mult = Math.max(
			(this.canvasSize.x / canvasAspectRatio) / (span.x / result.vAspectRatio),
			this.canvasSize.y / span.y  // Formula is asymmetric because Three's camera FOV is vertical.
		);

		result.subscreenSize = {
			x: this.canvasSize.x * mult,
			y: this.canvasSize.y * mult,
		};

		const screenCenter = {
			x: this.canvasSize.x/2,
			y: this.canvasSize.y/2,
		};
		const subscreenCenter = {
			x: THREE.MathUtils.lerp(state.engine.borders.left, state.engine.borders.right, 0.5),
			y: THREE.MathUtils.lerp(state.engine.borders.top, state.engine.borders.bottom, 0.5),
		};
		const offset = {  // Lateral offset for when margins arent symmetrical
			x: screenCenter.x - subscreenCenter.x,
			y: screenCenter.y - subscreenCenter.y,
		};

		result.corner = {
			x: this.canvasSize.x/2 - result.subscreenSize.x/2 + offset.x*mult,
			y: this.canvasSize.y/2 - result.subscreenSize.y/2 + offset.y*mult,
		};

		return result;
	}

}


// MARK: Utils

function __unitRect(diagonalDeg) {
	const diagonalRad = THREE.MathUtils.degToRad(diagonalDeg);
	const height = Math.sin(diagonalRad);
	const width = Math.sqrt(1 - height * height);
	return new THREE.Vector2(width, height);
}
