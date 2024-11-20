import * as THREE from 'three';
import engine from 'engine';
import * as GAMEOBJECTS from 'gameobjects';
import global from 'global';


export default class CameraTarget {

	/* Target values */

    position = new THREE.Vector3();
    rotation = new THREE.Quaternion();
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
	smoothSpeed = 5;


	/* Mouse perspective */

	mousePositionMultiplier = new THREE.Vector2(1, 1);
	mouseRotationMultiplier = new THREE.Vector2(90,90);
	/** Local space coordinates relative to this.transform */
	mouseRotationPivotPosition = new THREE.Vector3();


	#current = {
		pos: structuredClone(this.position),
		rot: structuredClone(this.rotation),
		fov: this.fov,
		diagonal: this.diagonal,
	}
	#previousCamera = null;
	#visualizer;
	#geo;


	constructor() {
		this.#geo = new THREE.BufferGeometry();
		const mat = new THREE.LineBasicMaterial({
			depthTest: false,
			color: 0xffff00,
		});
		this.#visualizer = new THREE.LineLoop(this.#geo, mat);
		this.#visualizer.name = 'Camera Target Visualization'
		engine.environmentScene.add(this.#visualizer);
	}


	/**
	 * @param {number} delta
	 * @param {THREE.PerspectiveCamera} camera
	 * @param {THREE.Vector2} canvasSize
	 */
	onFrame(delta, camera, canvasSize) {

		// Force teleport if we have a new camera.
		if (this.#previousCamera !== camera) {
			this.#previousCamera = camera;
			this.teleportNow = true;
		}

		if (this.teleportNow) {
			this.teleportNow = false;
			this.#current.pos = this.position;
			this.#current.rot = this.rotation;
			this.#current.fov = this.fov;
			this.#current.diagonal = this.diagonal;
		} else {
			this.#current.pos = global.smooth(this.#current.pos, this.position,
				this.smoothSpeed, delta);
			this.#current.rot = global.smooth(this.#current.rot, this.rotation,
				this.smoothSpeed, delta);
			this.#current.fov = global.smooth(this.#current.fov, this.fov,
				this.smoothSpeed, delta);
			this.#current.diagonal = global.smooth(this.#current.diagonal, this.diagonal,
				this.smoothSpeed, delta);
		}

		camera.position.copy(this.#current.pos);
		camera.rotation.setFromQuaternion(this.#current.rot);
		camera.fov = this.#current.fov;

		this.#cameraRefresh(camera, canvasSize);
	}


	/** @param {THREE.PerspectiveCamera} camera */
	#updateVisualizer(camera, aspectRatio) {
		// Let the camera do the work to calculate the points we need.
		const oldAspect = camera.aspect;
		const oldFar = camera.far;
		let helper;

		try {
			camera.aspect = aspectRatio;
			camera.far = camera.near + 0.5;
			camera.clearViewOffset();
			camera.updateProjectionMatrix();

			helper = new THREE.CameraHelper(camera);
			helper.update();

			const g = helper.geometry.attributes.position.array;
			const p = helper.pointMap;
			debugger
			const vertices = [
				new THREE.Vector3(g[p.f1[0]], g[p.f1[1]], g[p.f1[2]]).unproject(camera),
				new THREE.Vector3(g[p.f3[0]], g[p.f3[1]], g[p.f3[2]]).unproject(camera),
				new THREE.Vector3(g[p.f2[0]], g[p.f2[1]], g[p.f2[2]]).unproject(camera),
				new THREE.Vector3(g[p.f4[0]], g[p.f4[1]], g[p.f4[2]]).unproject(camera),
			];

			this.#geo.setFromPoints(vertices);

		} catch (error) {
			// catch because we can't afford this to interrupt the rest of the code
			console.error(' 🥺   uh oh\n👉👈  this is not supposed to happen');
		}

		camera.aspect = oldAspect;
		camera.far = oldFar;
		if (helper != undefined)  helper.dispose();
	}


	/**
	 * @param {THREE.PerspectiveCamera} camera
	 * @param {THREE.Vector2} canvasSize
	 */
	#cameraRefresh(camera, canvasSize) {

		let result;
		try {
			result = this.#tryCalculateBorderAvoidance(canvasSize);
			const THRESHOLD = 0.3;
			if (result.subscreenSize.x / canvasSize.x < THRESHOLD
			|| result.subscreenSize.y / canvasSize.y < THRESHOLD) {
				throw Error("Borders are eating too much of the screen, the game would be unreasonably small.");
			}
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
		this.#updateVisualizer(camera, result.vAspectRatio);

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

