import * as THREE from 'three';
import engine from 'engine';


export default {


	isDebugMode: true,


	// Readonly getters, because yes, i am that paranoid of accidentally replacing variables.
	get scene() { return __scene; },
	get camera() { return __camera; },
	get html_debugBox() { return __html_debugBox; },


	/**
	 * Call this function only once per index.html load, or else 💥
	 * @param {THREE.WebGLRendererParameters} rendererParameters
	 */
	initialize(rendererParameters) {
		{  // Setup DOM elements
			const html_container = document.createElement("div");
			html_container.id = "engine";
			document.body.insertBefore(html_container, document.body.firstChild);

			__html_canvas = document.createElement("canvas");
			html_container.appendChild(__html_canvas);

			__html_debugBox = document.createElement("div");
			__html_debugBox.classList.add("engine-debug-box");
			if (engine.isDebugMode !== true) __html_debugBox.style.display = 'none';
			html_container.appendChild(__html_debugBox);
		}

		{  // Setup ThreeJS
			__scene = new THREE.Scene();
			__scene.addEventListener('childadded', __onObjectAddedToScene);
			__scene.addEventListener('childremoved', __onObjectRemovedFromScene);

			__camera = new THREE.PerspectiveCamera();

			rendererParameters.canvas = __html_canvas;
			__renderer = new THREE.WebGLRenderer(rendererParameters);

			__clock = new THREE.Clock(true);

			window.addEventListener('resize', __onResize);
			__onResize();
		}
	},


	/** @param {DOMHighResTimeStamp} time requestAnimationFrame() can give this value. */
	render(time) {
		const delta = __clock.getDelta();

		//FIXME this is sus. everything is added in a frame. how does that affect traversal?
		// do i need a queue? i could make it so any new objects never call their frame in this loop,
		// and then __onObjectAddedToScene() forcefully calls it once in its place.
		// could store a list of events, but this way execution order is consistent.
		__scene.traverse((obj) => {
			if ('onFrame' in obj) {
				obj.onFrame(delta, time);
			}
		});

		__camera.updateProjectionMatrix();
		__renderer.render(__scene, __camera);
	},
};


/** @type {THREE.PerspectiveCamera} */
let __camera;

/** @type {THREE.WebGLRenderer} */
let __renderer;

/** @type {THREE.Scene} */
let __scene;

/** @type {THREE.Clock} */
let __clock;


/** @type {HTMLCanvasElement} */
let __html_canvas;

/** @type {HTMLDivElement} */
let __html_debugBox;


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
}


function __onObjectRemovedFromScene(e) {
	/** @type {THREE.Object3D} */
	const obj = e.child;

	// REVIEW what if threejs already does this?
	if ('dispose' in obj) {
		obj.dispose();
	}
}


function __onResize() {
	const rect = document.body.getBoundingClientRect();
	__renderer.setSize(rect.width, rect.height);
	__camera.aspect = rect.width / rect.height;
}
