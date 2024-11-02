import game from './game.js'


export default {

	get boardSize() { return __boardSize; },
	get boardEdges() { return __boardEdges; },
	get isPlaying() { return __isPlaying; },

	startPlaying(){
		if (game.isPlaying) throw Error('Already playing');

		//TODO

		__isPlaying = true;
	},

	stopPlaying() {
		if (!game.isPlaying) throw Error('Already not playing');

		//TODO

		__isPlaying = false;
	},
}


// These are redundant from ThreeJS but this way i dont have to import it,
// since this file really shouldnt care about Three
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;


var __boardDiagonalRadians = 0.5;
var __boardSize = {width: 0.2, height: 0.2};
var __boardEdges = {top: 0.1, right: 0.1, bottom: -0.1, left: -0.1};
__setBoardDiagonal(45);  // Create actually valid default values.


var __isPlaying = false;


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
