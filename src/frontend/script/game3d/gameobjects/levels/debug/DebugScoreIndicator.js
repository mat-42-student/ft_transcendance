import * as THREE from 'three';
import global from 'global';
import ScoreIndicator from '../../gameplay/ScoreIndicator.js';
import Cross2DHelper from '../..//utils/Cross2DHelper.js';


const SIZE = 0.05;
const CORNER_DISTANCE = SIZE/2;


export default class DebugScoreIndicator extends ScoreIndicator {

	#addedCount = 0;

	/** @type {THREE.Box3Helper} */
	#box;

	#playerMult;


	constructor(playerIndex) {
		super(playerIndex);
		this.#playerMult = this.playerIndex == 0 ? 1 : -1;
	}


	onAdded() {
		const half = SIZE / 2;

		const boxMin = new THREE.Vector3(
			-half,
			-half,
			-half
		);

		const boxMax = new THREE.Vector3(
			-boxMin.x,
			-boxMin.y,
			SIZE * global.game.maxScore - half,
		);

		this.#box = new THREE.Box3Helper(
			new THREE.Box3(boxMin, boxMax),
			new THREE.Color('#ffffff')
		);
		this.add(this.#box);
	}


	onFrame(delta, time) {
		super.onFrame(delta, time);

		this.position.set(
			this.#playerMult * (global.game.boardSize.x / 2 - CORNER_DISTANCE),
			-SIZE / 2,
			-global.game.boardSize.y / 2 + CORNER_DISTANCE
		);
	}


	scoreChanged(score) {
		super.scoreChanged(score);
		this.#addScorePoint();
	}


	#addScorePoint() {
		const newPoint = new Cross2DHelper(new THREE.Color("#ffffff"));

		newPoint.position.set(
			0,
			0,
			this.#addedCount * SIZE,
		);

		newPoint.rotateOnWorldAxis(
			new THREE.Vector3(1, 0, 0),
			THREE.MathUtils.degToRad(-15)
		);

		newPoint.scale.set(SIZE, SIZE, SIZE);

		this.#addedCount++;
		this.add(newPoint);
	}


	dispose() {
		this.clear();
		this.#box = null;
	}
}
