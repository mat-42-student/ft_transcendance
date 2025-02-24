import { state } from '../main.js';
import * as THREE from 'three';
import * as UTILS from '../utils.js';
import CameraTarget from './CameraTarget.js';
import LevelIdle from './gameobjects/levels/LevelIdle.js';


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
			this.#html_debugBox = document.getElementById("engine-debug-box");
			this.#html_borderCopy = document.getElementById('engine-border-copy');
		}

		this.#cameraTarget = new CameraTarget();

		{  // Setup ThreeJS
			this.#idleWorld = new LevelIdle();
			const fakeEvent = { child: this.#idleWorld };
			__onObjectAddedToScene(fakeEvent);

			this.#camera = new THREE.PerspectiveCamera();

			this.#renderer = new THREE.WebGLRenderer({
				canvas: this.#html_canvas,
				antialias: true,
				powerPreference: "high-performance",
			});
			this.#renderer.toneMapping = THREE.ACESFilmicToneMapping;
			this.#renderer.toneMappingExposure = 1;
		}

		const resizeCallback = this.#onResize.bind(this);
		this.#resizeObserver = new ResizeObserver(resizeCallback);
		this.#resizeObserver.observe(document.getElementsByClassName('main-content')[0]);
		window.addEventListener('resize', resizeCallback);
	}


	// Readonly getters, because yes, i am that paranoid of accidentally replacing variables.
	get cameraTarget() { return this.#cameraTarget; }
	get renderer() { return this.#renderer; }
	get html_debugBox() { return this.#html_debugBox; }
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

	/**
	 * The Scene that contains gameplay elements.
	 * It gets replaced for every match.
	 * @type {THREE.Scene}
	 * @see {@link idleWorld} The other Scene, that never gets replaced.
	 */
	get gameWorld() { return this.#gameWorld; };
	set gameWorld(value) {
		if (this.#gameWorld && this.#gameWorld.dispose) {
			this.#gameWorld.dispose();
		}

		this.#gameWorld = value;

		if (this.#gameWorld) {
			const fakeEvent = { child: this.#gameWorld };
			__onObjectAddedToScene(fakeEvent);
		}
	}

	/**
	 * The Scene that never gets replaced. This never needs to load.
	 * It is used while {@link gameWorld} is not.
	 */
	get idleWorld() { return this.#idleWorld; }


	/**
	 * @param {number} delta
	 * @param {DOMHighResTimeStamp} time requestAnimationFrame() can give this value.
	 */
	render(delta, time) {
		this.#updateAutoResolution(delta);

		this.isProcessingFrame = true;

		{  // Game logic update
			this.paramsForAddDuringRender = {delta: delta, time: time};

			const updateQueue = [];

			this.#activeWorld.traverse((obj) => {
				if ('onFrame' in obj) {
					updateQueue.push(obj.onFrame.bind(obj));
				}
			});

			for (const objectRenderFunction of updateQueue) {
				objectRenderFunction(delta, time);
			}

			this.paramsForAddDuringRender = null;
		}

		this.#renderer.render(this.#activeWorld, this.#camera);

		this.isProcessingFrame = false;
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
	#gameWorld;

	/** @type {THREE.Scene} */
	#idleWorld;

	/** @type {ResizeObserver} */
	#resizeObserver;


	/** @type {HTMLDivElement} */
	#html_container;

	/** @type {HTMLCanvasElement} */
	#html_canvas;

	/** @type {HTMLDivElement} */
	#html_debugBox;

	/** @type {HTMLDivElement} */
	#html_borderCopy;


	#onResize() {
		const rect = this.#html_container.getBoundingClientRect();
		this.#updateAutoResolution();
		this.#renderer.setSize(rect.width, rect.height);
		this.#camera.aspect = rect.width / rect.height;
		this.#html_debugBox.style.bottom = (rect.height - this.borders.bottom) + 'px';
		this.#html_debugBox.style.left = this.borders.left + 'px';

		this.borders.top    = rect.y;
		this.borders.right  = rect.x + rect.width;
		this.borders.bottom = rect.y + rect.height;
		this.borders.left   = rect.x;
	}


	#updateAutoResolution() {
		const fullres = window.devicePixelRatio;
		const lowres = fullres / 2;
		this.#renderer.setPixelRatio(UTILS.shouldPowersave ? lowres : fullres);
	}


	get #activeWorld() {
		return state.isPlaying ? this.gameWorld : this.idleWorld;
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
