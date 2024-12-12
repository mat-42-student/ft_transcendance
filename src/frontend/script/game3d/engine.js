import * as THREE from 'three';
import engine from 'engine';
import CameraTarget from './CameraTarget.js';
import global from 'global';
import PersistentDebug from './gameobjects/utils/PersistentDebug.js';


// MARK: Public
export default {

	// Readonly getters, because yes, i am that paranoid of accidentally replacing variables.
	/**
	 * This is intended for changing environment, not the scene's child Object3D.
	 * Use engine.level instead for that purpose.
	 */
	get environmentScene() { return __scene; },
	get level() { return __level; },
	get cameraTarget() { return __cameraTarget; },
	get renderer() { return __renderer; },
	get html_debugBox() { return __html_debugBox; },
	/** General purpose flag that can be read by anyone.
	 * Ideally any debug related visualization or feature remains in the code,
	 * but is switched on/off based on this. */
	get DEBUG_MODE() { return __DEBUG_MODE; },

	borders: {
		top: 0, left: 0,
		right: 500, bottom: 500,
	},

	/** is there active gameplay? or is it paused for any reason */
	get isRunning() {
		return (!__isWaitingForGameStart
			&& __loadingCounter === 0
			&& !__isConnecting
			&& !__isPaused
		);
	},

	set isWaitingForGameStart(value) {
		__isWaitingForGameStart = value;
		const cl = 'waiting-game-start';
		if (value)
			__html_loading_text.classList.add(cl);
		else
			__html_loading_text.classList.remove(cl);
	},


	/**
	 * Call this function only once per index.html load, or else 💥
	 */
	initialize() {
		{  // Setup DOM elements
			__html_container = document.createElement("div");
			__html_container.id = "engine";
			if (engine.DEBUG_MODE) {
				__html_container.classList.add('debug-mode');
			}
			document.body.insertBefore(__html_container, document.body.firstChild);

			__html_canvas = document.createElement("canvas");
			__html_container.appendChild(__html_canvas);


			__html_debugBox = document.createElement("div");
			__html_debugBox.classList.add("engine-debug-box");
			__html_container.appendChild(__html_debugBox);

			__html_borderCopy = document.createElement('div');
			__html_borderCopy.id = 'engine-border-copy';
			__html_container.appendChild(__html_borderCopy);

			//TODO wip loading rework (add new stuff)
			__html_loading_text = document.createElement("div");
			__html_loading_text.id = 'engine-loading-text';
			__html_borderCopy.appendChild(__html_loading_text);
			// Connecting
			// Loading 3D content
			// Waiting for other player
			// Paused? (hidden - but there needs to be a generic 'is running' property that checks everything. And a hidden property for the pre match / game countdown.)
		}

		{  // Setup ThreeJS
			__scene = new THREE.Scene();
			__scene.name = "Engine Scene";

			const fakeEvent = { child: __scene };
			__onObjectAddedToScene(fakeEvent);

			__camera = new THREE.PerspectiveCamera();

			__renderer = new THREE.WebGLRenderer({
				canvas: __html_canvas,
				antialias: true,
				powerPreference: "high-performance",
			});
			__renderer.toneMapping = THREE.ACESFilmicToneMapping;
			__renderer.toneMappingExposure = 1;

			THREE.DefaultLoadingManager.onLoad = __decreaseLoadingCounter;
			THREE.DefaultLoadingManager.onError = __decreaseLoadingCounter;
			THREE.DefaultLoadingManager.onStart = __increaseLoadingCounter;
			// THREE.DefaultLoadingManager.onProgress = () => {console.log('Default load progress')}  //REVIEW timeout? do the loaders automatically do it by failing?

			engine.clearLevel();

			window.addEventListener('resize', __onResize);
			__onResize();
		}

		__cameraTarget = new CameraTarget();

		let htmlAutoBorder = document.body.getElementsByTagName('auto-engine-border');
		if (htmlAutoBorder) {
			htmlAutoBorder = htmlAutoBorder.item(0);
			if (htmlAutoBorder.update) {
				htmlAutoBorder.update();
			}
		}

		__persistentDebug = new PersistentDebug();
		__scene.add(__persistentDebug);
	},


	/**
	 * @param {number} delta
	 * @param {DOMHighResTimeStamp} time requestAnimationFrame() can give this value.
	 */
	render(delta, time) {
		__updateAutoResolution(delta);
		if (__loadingCounter !== 0) return;

		this.isProcessingFrame = true;

		{  // Game logic update
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

		{  // Camera system
			const canvasSize = new THREE.Vector2(__renderer.domElement.clientWidth,
				__renderer.domElement.clientHeight);
			__cameraTarget.onFrame(delta, __camera, canvasSize, __html_borderCopy);
		}

		__renderer.render(__scene, __camera);

		this.isProcessingFrame = false;
	},

	/** Replaces engine.level with a fresh new empty Group. */
	clearLevel() {
		if (this.isProcessingFrame) throw Error("Nuh uh");
		__scene.remove(__level);
		__level = new THREE.Group();
		__level.name = "Engine Level";
		__scene.add(__level);
	},

	refreshBorder() {
		const rect = __html_container.getBoundingClientRect();
		__html_debugBox.style.bottom = (rect.height - engine.borders.bottom) + 'px';
		__html_debugBox.style.left = engine.borders.left + 'px';
	},
};


// MARK: Private

const __DEBUG_MODE = true;


/** @type {THREE.PerspectiveCamera} */
let __camera;

/** @type {CameraTarget} */
let __cameraTarget;

/** @type {THREE.WebGLRenderer} */
let __renderer;

/** @type {THREE.Scene} */
let __scene;

/** @type {THREE.Group} */
let __level;


/** @type {HTMLDivElement} */
let __html_container;

/** @type {HTMLCanvasElement} */
let __html_canvas;

/** @type {HTMLDivElement} */
let __html_debugBox;

/** @type {HTMLDivElement} */
let __html_borderCopy;

/** @type {HTMLDivElement} */
let __html_loading_text;


/** Pixel density used for auto resolution */
let __currentRatio = window.devicePixelRatio;


/** @type {PersistentDebug} */
let __persistentDebug;

/** Number of things that are in the process of loading. */
let __loadingCounter = 0;
let __isWaitingForGameStart = false;
let __isConnecting = false;
let __isPaused = false;


/**
 * tracks if we are during a engine.render() call (null if not),
 * and if so, stores the parameters to be passed to Object3D's onRender() methods.
 * @type {null | {delta: number, time: DOMHighResTimeStamp}}
 */
let __paramsForAddDuringRender = null;


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


function __onObjectRemoved(e) {
	/** @type {THREE.Object3D} */
	const obj = e.target;

	obj.clear();

	// you can opt out of auto dispose, if you need to 'reuse' your object3D.
	if ('dispose' in obj && obj.noAutoDispose !== true) {
		obj.dispose();
	}
}


function __onResize() {
	const rect = __html_container.getBoundingClientRect();
	__renderer.setPixelRatio(__currentRatio);
	__renderer.setSize(rect.width, rect.height);
	__camera.aspect = rect.width / rect.height;
	engine.refreshBorder();
}


function __updateAutoResolution(delta) {
	const fullres = window.devicePixelRatio;
	const lowres = fullres / 2;

	if (global.powersave) {
		__currentRatio = lowres;
		__persistentDebug.dAutoResolution.innerText = 'Auto resolution: Powersave mode';
	} else {
		__currentRatio = fullres;
		__persistentDebug.dAutoResolution.innerText = 'Auto resolution: Full';

		/*NOTE: commented out because i realize this would likely flicker on and off every alternating frame, which would be very distracting.
		const targetFramerate = 60 - 10;  // Add a margin because otherwise we will rarely hit the exact framerate cap
		const targetDelta = 1 / targetFramerate;
		if (delta > targetDelta) {
			__currentRatio = lowres;
			__persistentDebug.dAutoResolution.innerText = 'Auto resolution: Low';
		} else {
			__currentRatio = fullres;
			__persistentDebug.dAutoResolution.innerText = 'Auto resolution: Full';
		}
		*/
	}
	__renderer.setPixelRatio(__currentRatio);
}


function __decreaseLoadingCounter() {
	__loadingCounter--;
	if (__loadingCounter < 0) { __loadingCounter = 0; }  // idk, just in case

	if (__loadingCounter == 0) {
		//TODO signal load complete?
		__html_loading_text.classList.remove('loading');
	}
}


function __increaseLoadingCounter() {
	if (__loadingCounter == 0) {
		//TODO signal beginning of loading phase
		__html_loading_text.classList.add('loading');
	}
	__loadingCounter++;
}
