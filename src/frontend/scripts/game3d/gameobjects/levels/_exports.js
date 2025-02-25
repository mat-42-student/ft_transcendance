import LevelDebug from './debug/_level.js';
import LevelTest from './test/_level.js';


export const LIST = {
	'debug': LevelDebug,
	'test': LevelTest,
};


export function pickRandomLevel() {
	throw "TODO: the levels themselves are not ready yet";
	console.warn('Testing level "test", pickRandomLevel() is not actually picking a random level.');
	return LevelTest;  //REVIEW eventually delete
	// var keys = Object.keys(LIST);
	// return LIST[keys[ keys.length * Math.random() << 0]];
}
