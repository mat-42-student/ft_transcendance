import { state } from '../main.js';
import * as THREE from 'three';
import * as UTILS from '../utils.js';


export class Engine {

	// MARK: Public

	constructor() {
		// Does nothing. Call .init() instead.
		// Initialization code needs to read state.engine, which, at the time of running the
		// constructor, was not set yet.
	}

	init() {
		{  // Setup DOM elements
			this.#html_container = document.getElementById("engine");
			if (this.DEBUG_MODE) {
				this.#html_container.classList.add('debug-mode');
			}
			this.#html_canvas = document.getElementById("engine-canvas");
			this.#html_canvas.style.display = 'none';  // Hide by default, shows up again when a scene exists.
		}

		{  // Setup ThreeJS
			this.#renderer = new THREE.WebGLRenderer({
				canvas: this.#html_canvas,
				antialias: true,
				powerPreference: "high-performance",
			});
			this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
			this.renderer.toneMappingExposure = 1;
		}

		const resizeCallback = this.#onResize.bind(this);
		this.#resizeObserver = new ResizeObserver(resizeCallback);
		this.#resizeObserver.observe(document.getElementsByClassName('main-content')[0]);
		window.addEventListener('resize', resizeCallback);
	}


	// Readonly getters, because yes, i am that paranoid of accidentally replacing variables.
	get renderer() { return this.#renderer; }
	/** General purpose flag that can be read by anyone.
	 * Ideally any debug related visualization or feature remains in the code,
	 * but is switched on/off based on this. */
	get DEBUG_MODE() { return this.#DEBUG_MODE; }

	borders = { top: 0, left: 0, right: 500, bottom: 500 };

	/**
	 * tracks if we are during a {@link render} call (null if not),
	 * and if so, stores the parameters to be passed to Object3D's onRender() methods.
	 * @type {null | {delta: number, time: DOMHighResTimeStamp}}
	 */
	paramsForAddDuringRender = null;

	get scene() { return this.#scene; }
	set scene(newScene) {
		if (this.#scene && this.#scene.dispose) {
			// this.#scene.dispose();
			console.warn('Replaced engine.scene: make sure to dispose() the old scene manually.');
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


	/**
	 * @param {number} delta
	 * @param {DOMHighResTimeStamp} time requestAnimationFrame() can give this value.
	 */
	render(delta, time) {
		if (this.scene == null) {
			return;
		}
		if (this.scene.camera == null) {
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

		this.renderer.render(this.scene, this.scene.camera);

		this.isProcessingFrame = false;
	}


	// MARK: Private

	#DEBUG_MODE = true;

	/** @type {THREE.WebGLRenderer} */
	#renderer;

	/** @type {THREE.Scene} */
	#gameWorld;

	/** @type {THREE.Scene} */
	#idleWorld;

	/** @type {ResizeObserver} */
	#resizeObserver;

	/** @type {THREE.Scene} */
	#scene;


	/** @type {HTMLDivElement} */
	#html_container;

	/** @type {HTMLCanvasElement} */
	#html_canvas;


	#onResize() {
		const rect = this.#html_container.getBoundingClientRect();
		this.#updateAutoResolution();
		this.renderer.setSize(rect.width, rect.height);
		if (this.scene && this.scene.camera) {
			this.scene.camera.aspect = rect.width / rect.height;
		}

		this.borders.top    = rect.y;
		this.borders.right  = rect.x + rect.width;
		this.borders.bottom = rect.y + rect.height;
		this.borders.left   = rect.x;
	}


	#updateAutoResolution() {
		const fullres = window.devicePixelRatio;
		const lowres = fullres / 2;
		this.renderer.setPixelRatio(UTILS.shouldPowersave ? lowres : fullres);
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
