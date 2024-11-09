import * as DEBUG from './debug/_level.js';

export const LIST = {
	'debug': DEBUG,
};

export function pickRandomLevel() {
	var keys = Object.keys(LIST);
	return LIST[keys[ keys.length * Math.random() << 0]];
}
