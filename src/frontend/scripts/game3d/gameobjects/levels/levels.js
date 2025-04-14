import LevelBase from './LevelBase.js';
import LevelDebug from './debug/LevelDebug.js';


export const LIST = {
	'debug': LevelDebug,
};


/** @returns {LevelBase} */
export function pickRandomLevel() {
	const keys = Object.keys(LIST);
	const randomIndex = Math.floor(keys.length * Math.random());
	const key = keys[randomIndex];
	return LIST[key];
}
