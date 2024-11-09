export default class GameState {
	isPlaying = false;
	ballPosition = {x: 0, y: 0};
	paddlePositions = [0, 0];
	paddleHeights = [0, 0];
	boardSize = {width: 1.0, height: 1.0};
	scores = [0, 0];
	focusedPlayerIndex = 0;
	playerNames = ['Uninitialized', 'Uninitialized'];
}
