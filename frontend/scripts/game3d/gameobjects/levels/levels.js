import LevelBase from './LevelBase.js';
import LevelRetroPong from './retro/LevelRetroPong.js';
import LevelDebug from './debug/LevelDebug.js';


const RANDOM_LIST = {
	'retro-pong': LevelRetroPong,

};


export const LIST = {
	'debug': LevelDebug,
	...RANDOM_LIST,
};


/** @returns {LevelBase} */
export function pickRandomLevel() {
	const keys = Object.keys(RANDOM_LIST);
	const randomIndex = Math.floor(keys.length * Math.random());
	const key = keys[randomIndex];
	return RANDOM_LIST[key];
}
