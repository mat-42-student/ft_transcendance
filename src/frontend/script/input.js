import global from "global";
import input from "input";


export default {

	get currentlyPressed() { return __currentlyPressed; },


	get currentPaddleInputs() {
		const playerKeys = __getPlayerKeys();

		let result = [];
		for (let i = 0; i < 2; i++) {
			result[i] = (
				__currentlyPressed.has(playerKeys[i].negative ? -1 : 0)
			  + __currentlyPressed.has(playerKeys[i].positive ? +1 : 0)
			);
		}
		return result;
	},
}


let __currentlyPressed = new Set([]);


window.addEventListener('keydown', (event) => {
	// KeyboardEvent.code ignores keyboard layout, only cares about physical position.
	__currentlyPressed.add(event.code);
});

window.addEventListener('keyup', (event) => {
	__currentlyPressed.delete(event.code);
});


function __getPlayerKeys() {
	const isFocusNeutral = global.game.focusedPlayerIndex < 0;
	return [
		{
			positive: isFocusNeutral ? 'KeyW' : 'KeyA',
			negative: isFocusNeutral ? 'KeyS' : 'KeyD',
		},
		{
			positive: isFocusNeutral ? 'ArrowUp' : 'ArrowRight',
			negative: isFocusNeutral ? 'ArrowDown' : 'ArrowLeft',
		},
	];
}
