import game from 'game';
import engine from 'engine';
import * as THREE from 'three';
import MatchCPU from './MatchCPU.js';


export default {

	get boardSize() { return __boardSize; },
	get boardEdges() { return __boardEdges; },
	/**
	 * Low angle = wide board. 45° = square board. High angle = tall board.
	 * @param {number} newAngleDegrees
	 */
	set boardDiagonal(newAngleDegrees) {
		if (__isPlaying === true) throw Error("Should not resize board while playing");
		if (typeof newAngleDegrees !== 'number') throw TypeError('Bad argument');
		if (newAngleDegrees < 20) throw RangeError("Angle too low");
		if (newAngleDegrees > 70) throw RangeError("Angle too high");

		__boardDiagonalRadians = THREE.MathUtils.degToRad(newAngleDegrees);

		__boardSize.width = Math.sin(__boardDiagonalRadians);
		__boardSize.height = Math.sqrt(1 - Math.pow(__boardSize.width, 2));

		__boardEdges.top = __boardSize.height / 2;
		__boardEdges.right = __boardSize.width / 2;
		__boardEdges.bottom = -__boardEdges.top;
		__boardEdges.left = -__boardEdges.right;
	},

	get isPlaying() { return __matchObject != null; },


	ballPosition: { x: 0, y: 0 },
	level: null,

	usernames: ['No name', 'No name'],
	paddlePositions: [0, 0],
	paddleHeights: [0.2, 0.2],
	scores: [0, 0],
	paddleSpeeds: [1,1],

	/** -1 (neutral camera), 0/1 (select player) */
	cameraFocus: 0,


	/**
	 * @param {string} matchType
	 * @param {Object} matchParameters
	 */
	startPlaying(matchType, matchParameters) {
		if (game.isPlaying) throw Error('Already playing');

		engine.loading = true;

		// REVIEW check i haven't added new things
		// Nuke all variables. This allows for them to be checked afterwards.
		this.ballPosition = this.level = this.usernames = this.paddlePositions
		= this.paddleHeights = this.scores = __boardDiagonalRadians = this.paddleSpeeds
		= undefined;

		try {
			if (matchType === 'localcpu') {
				__matchObject = new MatchCPU(matchParameters);
			} else if (matchType === 'local1v1') {
				throw "TODO"
				__matchObject = new Match1v1(matchParameters);
			} else if (matchType === 'online') {
				throw "TODO"
				__matchObject = new MatchOnline(matchParameters);
			} else {
				throw Error('Bad function argument');
			}

			__matchObject.startMatch();

			// Check that matchObject actually initialized everything because i dont trust my code.
			if (this.ballPosition == null || this.ballPosition.x == undefined || this.ballPosition.y == undefined)
				throw Error('Forgor');
			if (this.level == null)
				throw Error("Forgor");
			if (this.usernames == null || this.usernames.length != 2)
				throw Error("Forgor");
			if (this.paddlePositions == null || this.paddlePositions.length != 2)
				throw Error("Forgor");
			if (this.paddleHeights == null || this.paddleHeights.length != 2)
				throw Error("Forgor");
			if (this.scores == null || this.scores.length != 2)
				throw Error("Forgor");
			if (typeof __boardDiagonalRadians !== 'number')
				throw Error("Forgor");
			if (this.paddleSpeeds == null || this.paddleSpeeds.length != 2)
				throw Error("Forgor");
		} catch (error) {
			// Ensure this doesnt remain stuck.
			engine.loading = false;
			__matchObject = null;
			throw error;  // YEET
		}

		engine.loading = false;
	},


	onFrame(delta, time) {
		__matchObject.onFrame(delta, time);
	},


	stopPlaying() {
		if (!game.isPlaying) throw Error('Already not playing');
		__matchObject.stopMatch();
		__matchObject = null;
	},
}


let __matchObject = null;

let __boardDiagonalRadians = 0.5;
let __boardSize = { width: 0.2, height: 0.2 };
let __boardEdges = { top: 0.1, right: 0.1, bottom: -0.1, left: -0.1 };
game.boardDiagonal = 45;  // Create actually valid default values.

