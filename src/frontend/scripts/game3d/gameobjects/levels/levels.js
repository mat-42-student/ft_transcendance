import LevelBase from './LevelBase.js';
import LevelDebug from './debug/LevelDebug.js';
import LevelPingpong from './pingpong/LevelPingpong.js';


export const LIST = {
	// 'debug': LevelDebug,
	'pingpong': LevelPingpong,
};


/** @returns {LevelBase} */
export function pickRandomLevel() {
	const keys = Object.keys(LIST);
	const randomIndex = Math.floor(keys.length * Math.random());
	const key = keys[randomIndex];
	return LIST[key];
}
