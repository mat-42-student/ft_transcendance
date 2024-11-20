import * as THREE from 'three';
import engine from 'engine';
import * as GAMEOBJECTS from 'gameobjects';
import global from 'global';


export default class CameraTarget {

	/* Target values */

    position = new THREE.Vector3();
    quaternion = new THREE.Quaternion();
	fov = 70;
	diagonal = 30;

	borders = {
		top: 100,
		right: 600,
		bottom: 600,
		left: 100,
	};


	/* Smooth interpolation */

	teleportNow = true;
	smoothSpeed = 10;


	/* Mouse perspective */

	mousePositionMultiplier = new THREE.Vector2(1, 1);
	mouseRotationMultiplier = new THREE.Vector2(90,90);
	/** Local space coordinates relative to this.transform */
	mouseRotationPivotPosition = new THREE.Vector3();


	#current = {
		position: this.position.clone(),
		quaternion: this.quaternion.clone(),
		fov: this.fov,
		diagonal: this.diagonal,
	}
	#previousCamera = null;
	#visualizer;
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
	}


	/**
	 * @param {number} delta
	 * @param {THREE.PerspectiveCamera} camera
	 * @param {THREE.Vector2} canvasSize
	 * @param {HTMLDivElement} borderVisualizer
	 */
	onFrame(delta, camera, canvasSize, borderVisualizer) {

		// Force teleport if we have a new camera.
		if (this.#previousCamera !== camera) {
			this.#previousCamera = camera;
			this.teleportNow = true;
		}

		if (this.teleportNow) {
			this.teleportNow = false;
			this.#current.position.copy(this.position);
			this.#current.quaternion.copy(this.quaternion);
			this.#current.fov = this.fov;
			this.#current.diagonal = this.diagonal;
		} else {
			this.#current.position = global.damp(this.#current.position, this.position,
				this.smoothSpeed, delta);
			this.#current.quaternion = global.damp(this.#current.quaternion, this.quaternion,
				this.smoothSpeed, delta);
			this.#current.fov = global.damp(this.#current.fov, this.fov,
				this.smoothSpeed, delta);
			this.#current.diagonal = global.damp(this.#current.diagonal, this.diagonal,
				this.smoothSpeed, delta);
		}

		camera.position.copy(this.#current.position);
		camera.rotation.setFromQuaternion(this.#current.quaternion);
		camera.fov = this.#current.fov;

		this.#updateBorderVisualizer(borderVisualizer, canvasSize);
		this.#cameraRefresh(camera, canvasSize);
	}


	/**
	 * @param {HTMLDivElement} borderVisualizer
	 * @param {THREE.Vector2} canvasSize
	 */
	#updateBorderVisualizer(borderVisualizer, canvasSize) {
		borderVisualizer.style.display = engine.DEBUG_MODE ? null : 'none';

		borderVisualizer.style.left = this.borders.left + 'px';
		borderVisualizer.style.top = this.borders.top + 'px';

		borderVisualizer.style.right = canvasSize.x - this.borders.right + 'px';
		borderVisualizer.style.bottom = canvasSize.y - this.borders.bottom + 'px';
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


	/** @param {THREE.Vector2} canvasSize */
	#tryCalculateBorderAvoidance(canvasSize) {
		let result = {};

		{
			//TODO delete this block, im just using it to test
			const margin = 10;
			this.borders.left = this.borders.top = margin;
			this.borders.right = canvasSize.x - margin;
			this.borders.bottom = canvasSize.y - margin;
		}

		const span = {
			x: this.borders.right - this.borders.left,
			y: this.borders.bottom - this.borders.top,
		};

		const unitRect = (() => {
			const angleRad = THREE.MathUtils.degToRad(this.#current.diagonal);
			const height = Math.sin(angleRad);
			const width = Math.sqrt(1 - height * height);
			return { x: width, y: height };
		})();

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
			x: THREE.MathUtils.lerp(this.borders.left, this.borders.right, 0.5),
			y: THREE.MathUtils.lerp(this.borders.top, this.borders.bottom, 0.5),
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
