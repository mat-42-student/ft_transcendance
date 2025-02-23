import { state } from '../main.js';
import * as THREE from 'three';
import * as UTILS from '../utils.js';
import CameraTarget from './CameraTarget.js';
import PersistentDebug from './gameobjects/utils/PersistentDebug.js';


export class Engine {

	// MARK: Public

	constructor() {
		{  // Setup DOM elements
			this.#html_container = document.getElementById("engine");
			if (this.DEBUG_MODE) {
				this.#html_container.classList.add('debug-mode');
			}
			this.#html_canvas = document.getElementById("engine-canvas");
			this.#html_debugBox = document.getElementById("engine-debug-box");
			this.#html_borderCopy = document.getElementById('engine-border-copy');
			this.#html_loadingText = document.getElementById("engine-loading-text");
		}

		{  // Setup ThreeJS
			this.#scene = new THREE.Scene();
			this.#scene.name = "Engine Scene";

			const fakeEvent = { child: this.#scene };
			__onObjectAddedToScene(fakeEvent);

			this.#camera = new THREE.PerspectiveCamera();

			this.#renderer = new THREE.WebGLRenderer({
				canvas: this.#html_canvas,
				antialias: true,
				powerPreference: "high-performance",
			});
			this.#renderer.toneMapping = THREE.ACESFilmicToneMapping;
			this.#renderer.toneMappingExposure = 1;

			this.clearLevel();

			window.addEventListener('resize', this.#onResize);
			this.#onResize();
		}

		this.#cameraTarget = new CameraTarget();

		let htmlAutoBorder = document.body.getElementsByTagName('auto-engine-border');  //FIXME auto-engine-border moved
		if (htmlAutoBorder) {
			htmlAutoBorder = htmlAutoBorder.item(0);
			if (htmlAutoBorder.update) {
				htmlAutoBorder.update();
			}
		}

		this.#persistentDebug = new PersistentDebug();
		this.#scene.add(this.#persistentDebug);
	}


	// Readonly getters, because yes, i am that paranoid of accidentally replacing variables.
	/**
	 * This is intended for changing environment, not the scene's child Object3D.
	 * Use {@link level} instead for that purpose.
	 */
	get environmentScene() { return this.#scene; }
	get level() { return this.#level; }
	get cameraTarget() { return this.#cameraTarget; }
	get renderer() { return this.#renderer; }
	get html_debugBox() { return this.#html_debugBox; }
	/** General purpose flag that can be read by anyone.
	 * Ideally any debug related visualization or feature remains in the code,
	 * but is switched on/off based on this. */
	get DEBUG_MODE() { return this.#DEBUG_MODE; }

	borders = {
		top: 0, left: 0,
		right: 500, bottom: 500,
	};

	/**
	 * tracks if we are during a {@link render} call (null if not),
	 * and if so, stores the parameters to be passed to Object3D's onRender() methods.
	 * @type {null | {delta: number, time: DOMHighResTimeStamp}}
	 */
	paramsForAddDuringRender = null;


	/**
	 * @param {number} delta
	 * @param {DOMHighResTimeStamp} time requestAnimationFrame() can give this value.
	 */
	render(delta, time) {
		this.#updateAutoResolution(delta);

		this.isProcessingFrame = true;

		{  // Game logic update
			this.paramsForAddDuringRender = {delta: delta, time: time};

			//REVIEW this could be cached, add and remove on events. do i care about this wasted computation?
			const updateQueue = [];

			this.#scene.traverse((obj) => {
				if ('onFrame' in obj) {
					updateQueue.push(obj.onFrame.bind(obj));
				}
			});

			for (const objectRenderFunction of updateQueue) {
				objectRenderFunction(delta, time);
			}

			this.paramsForAddDuringRender = null;
		}

		{  // Camera system
			const canvasSize = new THREE.Vector2(this.#renderer.domElement.clientWidth,
				this.#renderer.domElement.clientHeight);
			this.#cameraTarget.onFrame(delta, this.#camera, canvasSize, this.#html_borderCopy);
		}

		this.#renderer.render(this.#scene, this.#camera);

		this.isProcessingFrame = false;
	}

	/** Replaces {@link level} with a fresh new empty Group. */
	clearLevel() {
		if (this.isProcessingFrame) throw Error("Nuh uh");
		this.#scene.remove(this.#level);
		this.#level = new THREE.Group();
		this.#level.name = "Engine Level";
		this.#scene.add(this.#level);
	}

	refreshBorder() {
		const rect = this.#html_container.getBoundingClientRect();
		debugger
		this.#html_debugBox.style.bottom = (rect.height - this.borders.bottom) + 'px';
		this.#html_debugBox.style.left = this.borders.left + 'px';
	}


	// MARK: Private

	#DEBUG_MODE = true;


	/** @type {THREE.PerspectiveCamera} */
	#camera;

	/** @type {CameraTarget} */
	#cameraTarget;

	/** @type {THREE.WebGLRenderer} */
	#renderer;

	/** @type {THREE.Scene} */
	#scene;

	/** @type {THREE.Group} */
	#level;


	/** @type {HTMLDivElement} */
	#html_container;

	/** @type {HTMLCanvasElement} */
	#html_canvas;

	/** @type {HTMLDivElement} */
	#html_debugBox;

	/** @type {HTMLDivElement} */
	#html_borderCopy;

	/** @type {HTMLDivElement} */
	#html_loadingText;  //TODO i nuked the code that made this useful, add it back


	/** Pixel density used for auto resolution */
	#currentRatio = NaN;


	/** @type {PersistentDebug} */
	#persistentDebug;


	#onResize() {
		const rect = this.#html_container.getBoundingClientRect();
		this.#updateAutoResolution();
		this.#renderer.setSize(rect.width, rect.height);
		this.#camera.aspect = rect.width / rect.height;
		this.refreshBorder();
	}


	#updateAutoResolution() {
		const fullres = window.devicePixelRatio;
		const lowres = fullres / 2;

		if (UTILS.shouldPowersave && this.#currentRatio !== lowres) {
			this.#renderer.setPixelRatio(this.#currentRatio = lowres);
			this.#persistentDebug.dAutoResolution.innerText = 'Auto resolution: Powersave mode';
		} else if (!UTILS.shouldPowersave && this.#currentRatio !== fullres) {
			this.#renderer.setPixelRatio(this.#currentRatio = fullres);
			this.#persistentDebug.dAutoResolution.innerText = 'Auto resolution: Full';
		}
	}

};





function __onObjectAddedToScene(e) {
	/** @type {THREE.Object3D} */
	const obj = e.child;

	obj.addEventListener('childadded', __onObjectAddedToScene);
	obj.addEventListener('removed', __onObjectRemoved);

	const statics = obj.__proto__.constructor;
	if (statics.isLoaded === false) {
		throw Error("Adding an object that requires to be loaded, but isn't.");
	}

	if ('onAdded' in obj) {
		obj.onAdded();
	}

	// this.frame() will never call onFrame during the frame that something has been added in.
	// So we call it manually here, to avoid the first frame not having an update.
	// (That could be visible)
	// Yes, this means the first frame has inconsistent execution order,
	// compared to the next ones where the order is dictated by THREE.Object3D.traverse().
	// (which i assume depends on the tree structure of Object3D's in the scene)
	const params = state.engine.paramsForAddDuringRender;
	if (params != null && 'onFrame' in obj) {
		obj.onFrame(params.delta, params.time);
	}
}


function __onObjectRemoved(e) {
	/** @type {THREE.Object3D} */
	const obj = e.target;

	obj.clear();

	// you can opt out of auto dispose, if you need to 'reuse' your object3D.
	if ('dispose' in obj && obj.noAutoDispose !== true) {
		obj.dispose();
	}
}