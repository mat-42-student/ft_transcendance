import { state } from '../main.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import Stats from 'three/addons/libs/stats.module.js';
import * as UTILS from '../utils.js';
import LevelBase from './gameobjects/levels/LevelBase.js';
import LevelError from './gameobjects/levels/LevelError.js';
import LevelIdle from './gameobjects/levels/idle/LevelIdle.js';


export class Engine {

	// MARK: Public

	get renderer() { return this.#renderer; }

	/** General purpose flag that can be read by anyone.
	 * Ideally any debug related visualization or feature remains in the code,
	 * but is switched on/off based on this. */
	get DEBUG_MODE() { return this.#DEBUG_MODE; }

	/** Null check this property to know if the scene is loaded and ready to play.
	 * See also {@link state.isPlaying}
	 */
	get scene() { return this.#scene; }

	get gltfLoader() { return this.#gltfLoader; }

	borders = { top: 0, left: 0, right: 500, bottom: 500 };

	/** Plis ignore ok thx.
	 * Tracks if we are during a {@link render} call (null if not),
	 * and if so, stores the parameters to be passed to Object3D's onRender() methods.
	 * @type {null | {delta: number, time: DOMHighResTimeStamp}}
	 */
	paramsForAddDuringRender = null;

	stats = new Stats();


	/** Initialization code needs to read state.engine, which, at the time of running the constructor, was not set yet. */
	async init() {
		{  // Setup DOM elements
			this.#html_container = document.getElementById("engine");
			this.#html_canvas = document.getElementById("engine-canvas");
			this.#html_canvas.style.display = 'none';  // Hide by default, shows up again when a scene exists.

			this.#html_mainContent = document.getElementsByClassName('main-content')[0];

			this.stats.dom.style.position = null;
			this.stats.dom.id = "fps-meter";
			try {
				const el = document.getElementsByTagName("header")[0];
				el.prepend(this.stats.dom);
			} catch {}  // it is what it is...

			this.#html_loadError = document.getElementById("engine-loading-error");
		}

		{  // Setup ThreeJS
			this.#renderer = new THREE.WebGLRenderer({
				canvas: this.#html_canvas,
				antialias: true,
				powerPreference: "high-performance",
			});
			this.renderer.toneMapping = THREE.NoToneMapping;
			this.renderer.toneMappingExposure = 1;

			THREE.DefaultLoadingManager.onError = (url) => {
				console.error(`ThreeJS asset loading error: '${url}'.\n`,
					"Does the file not exist? Did we loose connection?"
				);
				if (state.gameApp != null) {
					console.warn('Quitting game because of loading error.');
					state.gameApp.close(true);
				}
			}

			this.fontLoader = new FontLoader();
			this.fontLoader.load(
				'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/fonts/helvetiker_regular.typeface.json',
				(font) => {
					state.engine.font = font;
				}
			);

			this.fontLoader.load(
				'/ressources/3d/Square One_Regular.json',
				(font) => {
					state.engine.squareFont = font;
				}
			);

			// dubious solution to a dubious problem
			while (this.font == undefined && this.squareFont == undefined) {
				await new Promise(resolve => setTimeout(resolve, 100));
			}
		}

		const resizeCallback = this.#onResize.bind(this);
		this.#resizeObserver = new ResizeObserver(resizeCallback);
		this.#resizeObserver.observe(this.#html_mainContent);
		window.addEventListener('resize', resizeCallback);

		// Debugging tools
		window.pause = () => { window._REQUESTED_PAUSE_FRAME_IGNORE_THIS_VARIABLE_OK_THANKS = true; };
		window.THREE = THREE;

		requestAnimationFrame(this.animationLoop.bind(this));
	}


	animationLoop() {
		if (window._REQUESTED_PAUSE_FRAME_IGNORE_THIS_VARIABLE_OK_THANKS) {
			window._REQUESTED_PAUSE_FRAME_IGNORE_THIS_VARIABLE_OK_THANKS = undefined;
			debugger;
		}

		try {
			this.stats.update();  // FPS meter

			const delta = this.#clock.getDelta();
			const time = this.#clock.elapsedTime;

			if (this.scene) {
				if (state && state.gameApp) {
					state.gameApp.frame(delta, time)
				}
				this.render(delta, time);
			}

			this.sceneWatchdog(delta);
		} catch (error) {
			console.error('ThreeJS Animation Loop: Error:', error);
			if (state.gameApp) {
				console.warn("Cancelling game because of rendering error.");
				state.gameApp.close(true);
			}
		}

		requestAnimationFrame(this.animationLoop.bind(this));
	}


	/**
	 * @param {number} delta
	 * @param {DOMHighResTimeStamp} time requestAnimationFrame() can give this value.
	 */
	render(delta, time) {
		if (this.scene == null) {
			return;
		}
		if (this.scene.smoothCamera == null) {
			console.error('Engine: Scene is missing a camera.');
			return;
		}

		this.#updateAutoResolution(delta);

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

		this.renderer.render(this.scene, this.scene.smoothCamera.camera);
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

		if (newScene) {
			this.#didSceneWatchdogAlreadyTry = false;
			this.#html_loadError.style.display = 'none';
			UTILS.autoMaterial(newScene);
		}

		this.#scene = newScene;
	}


	#didSceneWatchdogAlreadyTry = false;
	sceneWatchdog(delta) {
		if (this.scene == null
			&& (
				state.gameApp == null
				&& state.levelLoadingTempStorage == null
				&& state.waitpleasedontfreakout != true
			)
		) {
			// uh oh! this would be a stuck loading screen. warn the user...
			this.#html_loadError.style.display = null;
			// ...and attempt to fix that, but don't always try, or this would go on forever.
			if (this.#didSceneWatchdogAlreadyTry == false) {
				this.#didSceneWatchdogAlreadyTry = true;
				state.levelLoadingTempStorage = new LevelIdle();
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

	/** @type {HTMLElement} */
	#html_loadError;

	#clock = new THREE.Clock(true);


	#onResize() {
		const rect = this.#html_container.getBoundingClientRect();
		this.#updateAutoResolution();
		this.renderer?.setSize(rect.width, rect.height);
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
		// const res = UTILS.shouldPowersave() ? window.devicePixelRatio / 2 : window.devicePixelRatio;
		const res = window.devicePixelRatio;  // post processing changes appearance with resolution
		this.renderer?.setPixelRatio(res);
		this.renderer?.setPixelRatio(res);
	}

};
