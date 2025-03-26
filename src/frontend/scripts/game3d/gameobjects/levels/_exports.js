import LevelDebug from './debug/LevelDebug.js';
import { state } from '../../../main.js';
import LevelBase from './LevelBase.js';


export const LIST = {
	'debug': LevelDebug,
};


/** @returns {LevelBase} */
export function pickRandomLevel() {
	if (state && state.engine && state.engine.DEBUG_MODE == true) {
		return LevelDebug;
	}

	var keys = Object.keys(LIST);
	return LIST[keys[ keys.length * Math.random() << 0]];
}
