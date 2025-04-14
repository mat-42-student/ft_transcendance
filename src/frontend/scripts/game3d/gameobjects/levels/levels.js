import LevelBase from './LevelBase.js';
import LevelDebug from './debug/LevelDebug.js';
import LevelPingpong from './pingpong/LevelPingpong.js';


const RANDOM_LIST = {
	'debug': LevelDebug,
};


export const LIST = {
	...RANDOM_LIST,
	'pingpong': LevelPingpong,
};


/** @returns {LevelBase} */
export function pickRandomLevel() {
	const keys = Object.keys(RANDOM_LIST);
	const randomIndex = Math.floor(keys.length * Math.random());
	const key = keys[randomIndex];
	return RANDOM_LIST[key];
}
