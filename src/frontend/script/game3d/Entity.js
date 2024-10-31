import Engine from './Engine.js';


export default class Entity {
	/** @type {Engine} */
	engine;


	/**
	 * Go ahead and override this, but call super(engine); please or your head will ouchie.
	 * @param {Engine} engine
	 */
	constructor(engine) {
		if (!(engine instanceof Engine)) throw Error("Bad argument");

		this.engine = engine;
	}


	/**
	 * Called just after being added to the Engine's entity list.
	 * Initialize here things that depend on other Entities (otherwise, you can use a constructor)
	 */
	onReady() {
		Entity.throwIfNotLoaded();
	}


	/**
	 * Called every frame.
	 * @param {number} _delta Interval between last frame and current frame, in seconds.
	 * @param {DOMHighResTimeStamp} _time Present timestamp.
	 */
	onFrame(_delta, _time) {
		Entity.throwIfNotLoaded();
	}


	/**
	 * Called just before removing this Entity from the Engine it is in.
	 * Perform cleanup here.
	 */
	onDestroy() {
		Entity.throwIfNotLoaded();
	}


	static onLoad() {
		if (this.isLoaded === true) throw Error("Already loaded");

		this.isLoaded = true;
	}


	static onUnload() {
		if (this.isLoaded === false) throw Error("Already unloaded");

		this.isLoaded = false;
	}


	/**
	 * Helper function if you dont want to manually call load/unload.
	 */
	static autoLoad() {
		if (this.isLoaded === false) {
			this.onLoad();
		}
	}


	static throwIfNotLoaded() {
		if (this.isLoaded === false) throw Error(
			"The following operations require this Entity to be loaded.");
	}
}
