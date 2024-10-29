import * as THREE from 'three';


export default class Engine extends HTMLElement {

	/** @type {THREE.Scene} */
	scene3;

	/** @type {THREE.Camera} */
	camera3;

	/** @type {THREE.Renderer} */
	renderer3;

	/** @type {HTMLCanvasElement} */
	canvas;

	/** @type {HTMLDivElement} */
	debugOverlay;


	/**
	 * @param {THREE.WebGLRendererParameters} rendererParameters
	 */
	constructor(rendererParameters) {
		super();

		{  // DOM setup
			this.classList.add("engine");

			this.canvas = document.createElement("canvas");
			this.appendChild(this.canvas);

			this.debugOverlay = document.createElement("div");
			this.debugOverlay.classList.add("engine-debug-overlay");
			this.appendChild(this.debugOverlay);
		}

		this.rendererParameters = structuredClone(rendererParameters);
		this.rendererParameters["canvas"] = this.canvas;

	}


	connectedCallback() {
		this.scene3 = new THREE.Scene();
		this.camera3 = new THREE.PerspectiveCamera();
		this.renderer3 = new THREE.WebGLRenderer(this.rendererParameters);

		this.#clock = new THREE.Clock(true);
		this.#entities = [];
		this.#entityDestroyQueue = null;

		this.resizeCallback = this.#onResize.bind(this);
		window.addEventListener("resize", this.resizeCallback);
		this.#onResize();

		this.#frameCallback = this.#onFrame.bind(this);
		requestAnimationFrame(this.#frameCallback);
	}


	disconnectedCallback() {
		window.removeEventListener("resize", this.resizeCallback);
		this.#frameCallback = null;

		this.queueDestroyAllEntities();
		this.#destroyEntitiesNow();

		this.debugOverlay.innerHTML = '';
	}


	/** @param {ENGINE.Entity} entity */
	addEntity(entity) {
		if (!(entity instanceof ENGINE.Entity)) throw Error("Bad argument");

		this.#entities.push(entity);
		entity.onReady();
	}


	/** @param {ENGINE.Entity} entity */
	queueDestroyEntity(entity) {
		if (!(entity instanceof ENGINE.Entity)) throw Error("Bad argument");

		if (this.#entityDestroyQueue === null) {
			this.#entityDestroyQueue = new Set([entity]);
		} else {
			this.#entityDestroyQueue.add(entity);
		}
	}


	queueDestroyAllEntities() {
		for (const entity of this.#entities) {
			this.queueDestroyEntity(entity);
		}
	}


	////////////////////////////////////////////////////////////////////////////
	// MARK: #Private
	////////////////////////////////////////////////////////////////////////////


	/** @type {Set<ENGINE.Entity>} */
	#entities;

	/** @type {Set<ENGINE.Entity> | null = null} */
	#entityDestroyQueue;

	/** @type {THREE.Clock} */
	#clock;

	/** @type {any} */
	#frameCallback;


	#onResize() {
		const rect = this.getBoundingClientRect();
		this.renderer3.setSize(rect.width, rect.height);

		if (this.camera3 instanceof THREE.PerspectiveCamera) {
			this.camera3.aspect = rect.width / rect.height;
			this.camera3.updateProjectionMatrix();
		} else if (this.camera3 instanceof THREE.OrthographicCamera) {
			// honestly i dont know if this is sufficient, all my testing uses perspective camera
			this.camera3.updateProjectionMatrix();
		} else {
			console.warn('Camera of unknown type.',
				'Engine.#onResize() may need some work.');
		}
	}


	/** @param {DOMHighResTimeStamp} time */
	#onFrame(time) {
		if (this.#frameCallback === null) return;

		const delta = this.#clock.getDelta();

		for (const entity of this.#entities) {
			entity.onFrame(delta, time);
		}

		this.#destroyEntitiesNow();

		this.renderer3.render(this.scene3, this.camera3);
		requestAnimationFrame(this.#frameCallback);
	}


	#destroyEntitiesNow() {
		if (this.#entityDestroyQueue instanceof Set) {
			for (const toDestroy of this.#entityDestroyQueue) {
				toDestroy.onDestroy();
				this.#entities.splice(
					this.#entities.indexOf(toDestroy),
					1
				);
			}
			this.#entityDestroyQueue = null;
		}
	}
}
