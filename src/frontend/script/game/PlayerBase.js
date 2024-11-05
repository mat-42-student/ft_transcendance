import User from '../User.js';
import game from './game.js'


export default class PlayerBase {

	index;
	user;
	paddlePosition = 0;
	paddleHeight = 0.2;
	score = 0;


	/**
	 * @param {number} index Where this instance is saved in (game.players) .
	 * @param {User} user
	 */
	constructor(index, user) {
		this.index = index;
		this.user = user;
	}


	onFrame() {}


	onGameFinished() {}
}
