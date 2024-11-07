import game from './game.js'
import PlayerBase from './PlayerBase.js';


export default {

	get boardSize() { return __boardSize; },
	get boardEdges() { return __boardEdges; },
	get isPlaying() { return __matchObject != null; },


	ballPosition: { x: 0, y: 0 },

	usernames: ['No name', 'No name'],
	paddlePositions: [0, 0],
	paddleHeights: [0.2, 0.2],
	scores: [0, 0],


	startPlaying(matchObject) {
		if (game.isPlaying) throw Error('Already playing');
		__matchObject = matchObject;
		matchObject.startMatch();
		if (level == null) throw Error("Forgot to initialize the level!!!");
	},


	onFrame(time) {
		__matchObject.onFrame(time);
	},


	stopPlaying() {
		if (!game.isPlaying) throw Error('Already not playing');
		__matchObject.stopMatch();
		__matchObject = null;
	},
}


// These are redundant from ThreeJS but this way i dont have to import it,
// since this file really shouldnt care about Three
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;


let __matchObject = null;

let __boardDiagonalRadians = 0.5;
let __boardSize = { width: 0.2, height: 0.2 };
let __boardEdges = { top: 0.1, right: 0.1, bottom: -0.1, left: -0.1 };
__setBoardDiagonal(45);  // Create actually valid default values.

let __level = null;


/**
 * Low angle = wide board. 45° = square board. High angle = tall board.
 * @param {number} newAngleDegrees
 */
function __setBoardDiagonal(newAngleDegrees) {
	if (__isPlaying === true) throw Error("Should not resize board while playing");
	if (newAngleDegrees < 20) throw RangeError("Angle too low");
	if (newAngleDegrees > 70) throw RangeError("Angle too high");

	__boardDiagonalRadians = DEG2RAD * newAngleDegrees;

	__boardSize.width = Math.sin(__boardDiagonalRadians);
	__boardSize.height = Math.sqrt(1 - Math.pow(__boardSize.width, 2));

	__boardEdges.top = __boardSize.height / 2;
	__boardEdges.right = __boardSize.width / 2;
	__boardEdges.bottom = -__boardEdges.top;
	__boardEdges.left = -__boardEdges.right;
}
