import * as THREE from 'three';
import Ball from '../gameplay/Ball.js';
import Paddle from '../gameplay/Paddle.js';


export default class LevelBase {
	/** @type {Ball} */
	ball;

	/** @type {CameraStats[]} */
	cameras;

	/** @type {number} */
	boardDiagonal;

	/** @type {Paddle[]} */
	paddles;


	/** Override this */
	dispose() {}


	static CameraStats = class {
		/** @type {THREE.Vector3} */
		position;
		/** @type {THREE.Quaternion} */
		quaternion;
		/** @type {number} */
		fov;
	};
}
