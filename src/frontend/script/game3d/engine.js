import * as THREE from 'three';
import engine from 'engine';
import GameState from '../GameState.js';


// MARK: Public
export default {

	// Readonly getters, because yes, i am that paranoid of accidentally replacing variables.
	get scene() { return __scene; },
	get camera() { return __camera; },
	get renderer() { return __renderer; },
	get html_debugBox() { return __html_debugBox; },
	/** General purpose flag that can be read by anyone.
	 * Ideally any debug related visualization or feature remains in the code,
	 * but is switched on/off based on this. */
	get DEBUG_MODE() { return __DEBUG_MODE; },
	get gameState() { return __gameState; },


	/** Hide or display the loading overlay.
	 * @param {boolean} display */
	set loading(display) { __html_loading.style.display = display ? null : 'none'; },


	/**
	 * Call this function only once per index.html load, or else 💥
	 */
	initialize() {
		{  // Setup DOM elements
			__html_container = document.createElement("div");
			__html_container.id = "engine";
			document.body.insertBefore(__html_container, document.body.firstChild);

			__html_canvas = document.createElement("canvas");
			__html_container.appendChild(__html_canvas);

			__html_loading = document.createElement("div");
			__html_loading.innerText = 'loading...';
			__html_loading.id = 'engine-loading';
			__html_container.appendChild(__html_loading);
			engine.loading = false;

			__html_debugBox = document.createElement("div");
			__html_debugBox.classList.add("engine-debug-box");
			if (engine.DEBUG_MODE !== true) __html_debugBox.style.display = 'none';
			__html_container.appendChild(__html_debugBox);
		}

		{  // Setup ThreeJS
			__scene = new THREE.Scene();
			__scene.addEventListener('childadded', __onObjectAddedToScene);
			__scene.addEventListener('childremoved', __onObjectRemovedFromScene);

			__camera = new THREE.PerspectiveCamera();

			__renderer = new THREE.WebGLRenderer({
				canvas: __html_canvas,
				antialias: true,
				powerPreference: "high-performance",
			});
			__renderer.toneMapping = THREE.ACESFilmicToneMapping;
			__renderer.toneMappingExposure = 1;

			window.addEventListener('resize', __onResize);
			__onResize();
		}
	},


	/**
	 * @param {number} delta
	 * @param {DOMHighResTimeStamp} time requestAnimationFrame() can give this value.
	 */
	render(delta, time) {
		{  // Perform an update step
			__paramsForAddDuringRender = {delta: delta, time: time};

			const updateQueue = [];

			__scene.traverse((obj) => {
				if ('onFrame' in obj) {
					updateQueue.push(obj.onFrame.bind(obj));
				}
			});

			for (const objectRenderFunction of updateQueue) {
				objectRenderFunction(delta, time);
			}

			__paramsForAddDuringRender = null;
		}

		__camera.updateProjectionMatrix();
		__renderer.render(__scene, __camera);
	},
};


// MARK: Private

const __DEBUG_MODE= true;

let __gameState = new GameState();


/** @type {THREE.PerspectiveCamera} */
let __camera;

/** @type {THREE.WebGLRenderer} */
let __renderer;

/** @type {THREE.Scene} */
let __scene;


/** @type {HTMLDivElement} */
let __html_container;

/** @type {HTMLCanvasElement} */
let __html_canvas;

/** @type {HTMLDivElement} */
let __html_debugBox;

/** @type {HTMLDivElement} */
let __html_loading;


/**
 * tracks if we are during a engine.render() call (null if not),
 * and if so, stores the parameters to be passed to Object3D's onRender() methods.
 * @type {null | {delta: number, time: DOMHighResTimeStamp}}
 */
let __paramsForAddDuringRender = null;


function __onObjectAddedToScene(e) {
	/** @type {THREE.Object3D} */
	const obj = e.child;

	const statics = obj.__proto__.constructor;
	if (statics.isLoaded === false) {
		throw Error("Adding an object that requires to be loaded, but isn't.");
	}

	if ('onAdded' in obj) {
		obj.onAdded();
	}

	// engine.frame() will never call onFrame during the frame that something has been added in.
	// So we call it manually here, to avoid the first frame not having an update.
	// (That could be visible)
	// Yes, this means the first frame has inconsistent execution order,
	// compared to the next ones where the order is dictated by THREE.Object3D.traverse().
	// (which i assume depends on the tree structure of Object3D's in the scene)
	if (__paramsForAddDuringRender !== null) {
		if ('onFrame' in obj) {
			obj.onFrame(__paramsForAddDuringRender.delta, __paramsForAddDuringRender.time);
		}
	}
}


function __onObjectRemovedFromScene(e) {
	/** @type {THREE.Object3D} */
	const obj = e.child;

	// you can opt out of auto dispose, if you need to 'reuse' your object3D.
	if ('dispose' in obj && obj.noAutoDispose !== true) {
		obj.dispose();
	}
}


function __onResize() {
	const rect = __html_container.getBoundingClientRect();
	__renderer.setSize(rect.width, rect.height);
	__camera.aspect = rect.width / rect.height;
}
