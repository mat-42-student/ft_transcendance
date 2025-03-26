import { state } from '../main.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import * as UTILS from '../utils.js';
import LevelBase from './gameobjects/levels/LevelBase.js';


export class Engine {

	// MARK: Public

	get renderer() { return this.#renderer; }

	/** General purpose flag that can be read by anyone.
	 * Ideally any debug related visualization or feature remains in the code,
	 * but is switched on/off based on this. */
	get DEBUG_MODE() { return this.#DEBUG_MODE; }

	get scene() { return this.#scene; }

	get gltfLoader() { return this.#gltfLoader; }

	borders = { top: 0, left: 0, right: 500, bottom: 500 };

	/** Plis ignore ok thx.
	 * Tracks if we are during a {@link render} call (null if not),
	 * and if so, stores the parameters to be passed to Object3D's onRender() methods.
	 * @type {null | {delta: number, time: DOMHighResTimeStamp}}
	 */
	paramsForAddDuringRender = null;


	/** Initialization code needs to read state.engine, which, at the time of running the constructor, was not set yet. */
	init() {
		{  // Setup DOM elements
			this.#html_container = document.getElementById("engine");
			if (this.DEBUG_MODE) {
				this.#html_container.classList.add('debug-mode');
			}
			this.#html_canvas = document.getElementById("engine-canvas");
			this.#html_canvas.style.display = 'none';  // Hide by default, shows up again when a scene exists.

			this.#html_mainContent = document.getElementsByClassName('main-content')[0];
		}

		{  // Setup ThreeJS
			this.#renderer = new THREE.WebGLRenderer({
				canvas: this.#html_canvas,
				antialias: true,
				powerPreference: "high-performance",
			});
			this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
			this.renderer.toneMappingExposure = 1;

			this.fontLoader = new FontLoader();
			this.fontLoader.load(
				'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/fonts/helvetiker_regular.typeface.json',
				(font) => {
					state.engine.font = font;
				}
			);
		}

		const resizeCallback = this.#onResize.bind(this);
		this.#resizeObserver = new ResizeObserver(resizeCallback);
		this.#resizeObserver.observe(this.#html_mainContent);
		window.addEventListener('resize', resizeCallback);

		// Debugging tool
		window.pause = () => { window._REQUESTED_PAUSE_FRAME_IGNORE_THIS_VARIABLE_OK_THANKS = true; };
	}


	/**
	 * @param {number} delta
	 * @param {DOMHighResTimeStamp} time requestAnimationFrame() can give this value.
	 */
	render(delta, time) {
		if (window._REQUESTED_PAUSE_FRAME_IGNORE_THIS_VARIABLE_OK_THANKS) {
			window._REQUESTED_PAUSE_FRAME_IGNORE_THIS_VARIABLE_OK_THANKS = undefined;
			debugger;
		}

		if (this.scene == null) {
			return;
		}
		if (this.scene.smoothCamera == null) {
			console.error('Engine: Scene is missing a camera.');
			return;
		}

		this.#updateAutoResolution(delta);

		this.isProcessingFrame = true;

		{  // Game logic update
			this.paramsForAddDuringRender = {delta: delta, time: time};

			const updateQueue = [];

			this.scene.traverse((obj) => {
				if ('onFrame' in obj) {
					updateQueue.push(obj.onFrame.bind(obj));
				}
			});

			for (const objectRenderFunction of updateQueue) {
				objectRenderFunction(delta, time);
			}

			this.paramsForAddDuringRender = null;
		}

		// if (state.gameApp && state.gameApp.isPlaying)
			this.renderer.render(this.scene, this.scene.smoothCamera.camera);

		this.isProcessingFrame = false;
	}


	set scene(newScene) {
		if (this.#scene && this.#scene.dispose) {
			this.#scene.dispose();
		}

		// Hide or show canvas depending on if the engine will be able to render or not.
		if (this.#scene && !newScene) {
			this.#html_canvas.style.display = 'none';
		} else if (!this.scene && newScene) {
			this.#html_canvas.style.display = null;
		}

		this.#scene = newScene;

		if (this.#scene) {
			try {
				const fakeEvent = { child: this.#scene };
				__onObjectAddedToScene(fakeEvent);
			} catch (error) {
				console.error('Engine.scene could not be set. Is the new one valid?');
				this.#scene = null;
			}
		}
	}


	// MARK: Private

	#DEBUG_MODE = false;

	/** @type {THREE.WebGLRenderer} */
	#renderer;

	#gltfLoader = new GLTFLoader();

	/** @type {ResizeObserver} */
	#resizeObserver;

	/** @type {LevelBase} */
	#scene;

	/** @type {HTMLDivElement} */
	#html_container;

	/** @type {HTMLCanvasElement} */
	#html_canvas;

	/** @type {HTMLElement} */
	#html_mainContent;


	#onResize() {
		const rect = this.#html_container.getBoundingClientRect();
		this.#updateAutoResolution();
		this.renderer.setSize(rect.width, rect.height);
		if (this.scene && this.scene.smoothCamera) {
			this.scene.smoothCamera.aspect = rect.width / rect.height;
		}

		const borderRect = this.#html_mainContent.getBoundingClientRect();
		this.borders.top    = borderRect.y;
		this.borders.right  = borderRect.x + borderRect.width;
		this.borders.bottom = borderRect.y + borderRect.height;
		this.borders.left   = borderRect.x;
	}


	#updateAutoResolution() {
		const fullres = window.devicePixelRatio;
		const lowres = fullres / 2;
		this.renderer.setPixelRatio(UTILS.shouldPowersave() ? lowres : fullres);
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
