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

	get viewIndex() { return state.isPlaying ? state.gameApp.side : 2; }


	onAdded() {
		this.smoothCamera = new SmoothCamera();
		this.add(this.smoothCamera);
	}


	onFrame(delta, time) {
		if (this.views != null) {
			this.smoothCamera.position.copy(this.views.position[this.viewIndex]);
			this.smoothCamera.quaternion.copy(this.views.quaternion[this.viewIndex]);
			this.smoothCamera.fov = this.views.fov[this.viewIndex];
		}
	}


	dispose() {
		// do nothing, i just want the method to exist in case i need it later,
		// because child classes call super.dispose()
		console.log('Level.dispose() called');  //TODO remove log 'Level.dispose() called'
	}


	pause(time) {
		this.#isPaused = true;
	}

	unpause() {
		if (this.#isPaused != false) {
			this.#isPaused = false;
			return true;
		}
		return false;
	}


	/** Override in each level. Should display the winner. */
	endShowWinner(
		scores = [NaN, NaN],
		winner = NaN,
		playerNames = ['?1', '?2'],
	) {
		console.log('LevelBase:', playerNames[winner], 'won.', scores);  //TODO remove log 'End:Winner'
	}

	/** Override in each level. Should say the game was forfeited. Only for web game. */
	endShowWebQuit(
		quitter = NaN,
		playerNames = ['?1', '?2'],
	) {
		console.log('LevelBase:', playerNames[quitter], 'quit.');  //TODO remove log 'End:Quit'
	}

	/** Override in each level. Called when a local game is cancelled. */
	endShowNothing() {
		console.log('LevelBase: Game cancelled. (No display)');  //TODO remove log 'End:Nothing'
	}

	/**
	 * After endShow*() was run, when the user switches to a different page,
	 * this is automatically called.
	 * That way any other page content won't have a background that is also text.
	 * Override in each level.
	 */
	endHideResult() {
		console.log('LevelBase: End result hidden.');  //TODO remove log 'End:Hide'
	}


	#isPaused = false;

}
