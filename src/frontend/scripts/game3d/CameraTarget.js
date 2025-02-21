import * as THREE from 'three';
import engine from 'engine';
import * as GAMEOBJECTS from 'gameobjects';
import input from 'input';
import * as UTILS from '../utils.js';


//REVIEW When nothing is continuously updating the border, resizing the window is broken. Either check that this never happens, or add some failsafe.


export default class CameraTarget {

	/* Target values */
    position = new THREE.Vector3();
    quaternion = new THREE.Quaternion();
	fov = 70;
	diagonal = 30;

	/* Smooth interpolation */
	teleportNow = true;
	smoothSpeed = 10;

	/* Mouse perspective */
	mousePositionMultiplier = new THREE.Vector2(1, 1);
	mouseRotationMultiplier = new THREE.Vector2(1,1);


	#smooth = {
		position: this.position.clone(),
		quaternion: this.quaternion.clone(),
		fov: this.fov,
		diagonal: this.diagonal,
	}
	#previousCamera = null;
	#visualizer;
	#visualizer2;
	#geo;


	constructor() {
		this.#geo = new THREE.BufferGeometry();
		const mat = new THREE.LineBasicMaterial({
			// depthTest: false,
			color: 0xffff00,
		});
		this.#visualizer = new THREE.LineSegments(this.#geo, mat);
		this.#visualizer.name = 'Camera Target Visualization'
		engine.environmentScene.add(this.#visualizer);

		this.#visualizer2 = new THREE.LineSegments(this.#geo, mat);
		const secondVisualizerDistance = 100;
		this.#visualizer2.scale.set(secondVisualizerDistance, secondVisualizerDistance, secondVisualizerDistance);
		this.#visualizer2.position.set(0, 0, -(secondVisualizerDistance - 1));
		this.#visualizer.add(this.#visualizer2);
	}


	/**
	 * @param {number} delta
	 * @param {THREE.PerspectiveCamera} camera
	 * @param {THREE.Vector2} canvasSize
	 * @param {HTMLDivElement} borderVisualizer
	 */
	onFrame(delta, camera, canvasSize, borderVisualizer) {

		this.#recreateBordersIfReset(canvasSize);

		// Force teleport if we have a new camera.
		if (this.#previousCamera !== camera) {
			this.#previousCamera = camera;
			this.teleportNow = true;
		}

		const mouseOffsets = this.#updateMouse(canvasSize);
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

		camera.position.copy(this.#smooth.position);
		camera.rotation.setFromQuaternion(this.#smooth.quaternion);
		camera.fov = this.#smooth.fov;

		this.#cameraRefresh(camera, canvasSize);
		this.#updateBorderVisualizer(borderVisualizer, canvasSize);
	}


	/** @param {THREE.Vector2} canvasSize */
	#updateMouse(canvasSize) {
		const pos = new THREE.Vector2();
		if (document.hasFocus() && input.isMouseInWindow) {
			pos.set(
				(input.mouseX / canvasSize.x) * 2 - 1,
				(input.mouseY / canvasSize.y) * 2 - 1
			);
		}

		const mouseOffsets = {};

		mouseOffsets.position = new THREE.Vector3(
			-pos.x * this.mousePositionMultiplier.x,
			pos.y * this.mousePositionMultiplier.y,
			0
		);
		mouseOffsets.position.applyQuaternion(this.quaternion);

		const rx = new THREE.Quaternion().setFromAxisAngle(
				new THREE.Vector3(0, 1, 0),
				-pos.x * this.mouseRotationMultiplier.x
			);
		const ry = new THREE.Quaternion().setFromAxisAngle(
			new THREE.Vector3(1, 0, 0),
			-pos.y * this.mouseRotationMultiplier.y
		);
		mouseOffsets.quaternion = new THREE.Quaternion()
			.multiply(rx)
			.multiply(ry);

		return mouseOffsets;
	}


	/**
	 * @param {HTMLDivElement} borderVisualizer
	 * @param {THREE.Vector2} canvasSize
	 */
	#updateBorderVisualizer(borderVisualizer, canvasSize) {
		borderVisualizer.style.display = engine.DEBUG_MODE ? null : 'none';

		borderVisualizer.style.left = engine.borders.left + 'px';
		borderVisualizer.style.top = engine.borders.top + 'px';

		borderVisualizer.style.right = canvasSize.x - engine.borders.right + 'px';
		borderVisualizer.style.bottom = canvasSize.y - engine.borders.bottom + 'px';
	}


	/** @param {THREE.PerspectiveCamera} camera */
	#update3dVisualizer(camera, aspectRatio) {
		try {
			const offset = new THREE.Vector3(0,0,-1);
			offset.applyQuaternion(camera.quaternion);
			const planeCenter = new THREE.Vector3().copy(this.position).add(offset);

			this.#visualizer.position.copy(planeCenter);
			this.#visualizer.rotation.setFromQuaternion(this.quaternion);

			const fov_mult = __triangle_thing(this.fov / 2, 1);
			const h = (          1) * fov_mult;
			const w = (aspectRatio) * fov_mult;
			const corners = [
				new THREE.Vector3( w,  h, 0),
				new THREE.Vector3( w, -h, 0),
				new THREE.Vector3(-w,-h, 0),
				new THREE.Vector3(-w, h, 0),
			];
			const vertices = [
				corners[0], corners[1],
				corners[1], corners[2],
				corners[2], corners[3],
				corners[3], corners[0],

				// corners[0], corners[2],
				// corners[1], corners[3],
			];

			this.#geo.setFromPoints(vertices);

		} catch (error) {
			// catch because we can't afford this to interrupt the rest of the code
			console.error(' 🥺   uh oh\n👉👈  this is not supposed to happen');
		}
	}


	/**
	 * @param {THREE.PerspectiveCamera} camera
	 * @param {THREE.Vector2} canvasSize
	 */
	#cameraRefresh(camera, canvasSize) {

		let result;
		try {
			result = this.#tryCalculateBorderAvoidance(canvasSize);
			// const THRESHOLD = 0.3;
			// if (result.subscreenSize.x / canvasSize.x < THRESHOLD
			// || result.subscreenSize.y / canvasSize.y < THRESHOLD) {
			// 	throw Error("Borders are eating too much of the screen, the game would be unreasonably small.");
			// }
		} catch (error) {
			// Fallback: just render fullscreen.
			console.warn('CameraTarget: Error during margin avoidance calculations:', error,
				'Falling back to simple fullscreen view, ignoring borders and aspect ratio.');
			this.#visualizer.visible = false;
			camera.clearViewOffset();
			camera.updateProjectionMatrix();
			return;
		}

		this.#visualizer.visible = engine.DEBUG_MODE;
		this.#update3dVisualizer(camera, result.vAspectRatio);

		camera.setViewOffset(
			canvasSize.x, canvasSize.y,
			result.corner.x, result.corner.y,
			result.subscreenSize.x, result.subscreenSize.y,
		);
		camera.updateProjectionMatrix();
	}


	#recreateBordersIfReset(canvasSize) {
		if (engine.borders == null) {
			const margin = 0;
			engine.borders = {
				top: margin,
				right: canvasSize.x - margin,
				left: margin,
				bottom: canvasSize.y - margin,
			};
		}
	}


	/** @param {THREE.Vector2} canvasSize */
	#tryCalculateBorderAvoidance(canvasSize) {
		let result = {};

		const span = {
			x: engine.borders.right - engine.borders.left,
			y: engine.borders.bottom - engine.borders.top,
		};

		const unitRect = __unitRect(this.diagonal);
		const canvasAspectRatio = canvasSize.x / canvasSize.y;

		result.vAspectRatio = unitRect.x / unitRect.y;

		const mult = Math.max(
			(canvasSize.x / canvasAspectRatio) / (span.x / result.vAspectRatio),
			canvasSize.y / span.y  // Formula is asymmetric because Three's camera FOV is vertical.
		);

		result.subscreenSize = {
			x: canvasSize.x * mult,
			y: canvasSize.y * mult,
		};

		const screenCenter = {
			x: canvasSize.x/2,
			y: canvasSize.y/2,
		};
		const subscreenCenter = {
			x: THREE.MathUtils.lerp(engine.borders.left, engine.borders.right, 0.5),
			y: THREE.MathUtils.lerp(engine.borders.top, engine.borders.bottom, 0.5),
		};
		const offset = {  // Lateral offset for when margins arent symmetrical
			x: screenCenter.x - subscreenCenter.x,
			y: screenCenter.y - subscreenCenter.y,
		};

		result.corner = {
			x: canvasSize.x/2 - result.subscreenSize.x/2 + offset.x*mult,
			y: canvasSize.y/2 - result.subscreenSize.y/2 + offset.y*mult,
		};

		return result;
	}
}


function __triangle_thing(angle_deg, side_a) {
	const hypothenuse = side_a / Math.cos(THREE.MathUtils.degToRad(angle_deg));
	return Math.sqrt(hypothenuse*hypothenuse - side_a*side_a);
}

function __unitRect(diagonalDeg) {
	const diagonalRad = THREE.MathUtils.degToRad(diagonalDeg);
	const height = Math.sin(diagonalRad);
	const width = Math.sqrt(1 - height * height);
	return new THREE.Vector2(width, height);
}
