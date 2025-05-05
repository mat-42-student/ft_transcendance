import * as THREE from 'three';
import { state } from "../../../main.js";
import SmoothCamera from '../camera/SmoothCamera.js';


export default class LevelBase extends THREE.Scene {

	/** @type {SmoothCamera} */
	smoothCamera;

	boardSize = new THREE.Vector2(1, 1);

	/** Null this to skip auto view selection, and set data directly on {@link smoothCamera}. */
	views = {
		position: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()],
		quaternion: [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()],
		fov: [NaN, NaN, NaN],
	};

	smoothCamera = new SmoothCamera();

	get viewIndex() { return state.isPlaying ? state.gameApp.side : 2; }

	remainingToLoad = -1;


	constructor() {
		super();

		const fakeEvent = { child: this };
		onObjectAddedToScene(fakeEvent);
	}


	onAdded() {
		this.add(this.smoothCamera);
	}


	onFrame(delta, time) {
		if (this.views != null && this.smoothCamera != null) {
			this.smoothCamera.position.copy(this.views.position[this.viewIndex]);
			this.smoothCamera.quaternion.copy(this.views.quaternion[this.viewIndex]);
			this.smoothCamera.fov = this.views.fov[this.viewIndex];
		}

		// the namesReady function is called when a web game is done initializing,
		// so that the level can read a correct value for the usernames.
		if (this.namesReady != undefined
			&& this.namesReadyWasAlreadyExecuted != true
			&& state.gameApp != null
			&& state.gameApp.playerNames[0] != '-'
		) {
			this.namesReadyWasAlreadyExecuted = true;
			this.namesReady();
		}
	}


	dispose() {
		// do nothing, i just want the method to exist in case i need it later,
		// because child classes call super.dispose()
	}


	pause(time) {
		this.isPaused = true;
	}

	unpause() {
		if (this.isPaused != false) {
			this.isPaused = false;
			return true;
		}
		return false;
	}


	loadComplete() {
		this.remainingToLoad--;

		if (this.remainingToLoad === 0) {
			if (!state.gameApp || (state.gameApp && state.gameApp.level === this)) {
				state.engine.scene = this;
				if (typeof this.onLoadComplete == "function")  this.onLoadComplete();
				state.gameApp?.startLocalGame?.();
			} else {
				this.dispose();
			}
		} else if (this.remainingToLoad < 0) {
			throw new Error();
		}
	}


	/** Override in each level. Should display the winner. */
	endShowWinner(
		scores = [NaN, NaN],
		winner = NaN,
		playerNames = ['?1', '?2'],
	) {
		this.pendingEndHide = true;
	}

	/** Override in each level. Only for web game, when the other player has forfeited. */
	endShowWebOpponentQuit(opponentName) {
		this.pendingEndHide = true;
	}

	/** Override in each level. Only for web game, when you have forfeited. */
	endShowYouRagequit() {
		this.pendingEndHide = true;
	}

	/** Override in each level. Called when a local game is cancelled. */
	endShowNothing() {
		this.pendingEndHide = true;
	}

	/**
	 * After endShow*() was run, when the user switches to a different page,
	 * this is automatically called.
	 * That way any other page content won't have a background that is also text.
	 * Override in each level.
	 */
	endHideResult() {
		this.pendingEndHide = undefined;
	}


	isPaused = false;

}


// MARK: Injected functions

export function onObjectAddedToScene(e) {
	/** @type {THREE.Object3D} */
	const obj = e.child;

	obj.addEventListener('childadded', onObjectAddedToScene);
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
