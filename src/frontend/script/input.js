import global from "global";
import input from "input";


export default {

	get currentlyPressed() { return __currentlyPressed; },

	get mouseX() { return __mouseX; },
	get mouseY() { return __mouseY; },
	get isMouseInWindow() { return __isMouseInWindow; },


	get currentPaddleInputs() {
		const playerKeys = __getPlayerKeys();

		let result = [];
		for (let i = 0; i < 2; i++) {
			result[i] = (
				(__currentlyPressed.has(playerKeys[i].negative) ? -1 : 0)
			  + (__currentlyPressed.has(playerKeys[i].positive) ? +1 : 0)
			);
		}
		return result;
	},
}


let __currentlyPressed = new Set([]);
let __mouseX = 0;
let __mouseY = 0;
let __isMouseInWindow = false;


window.addEventListener('keydown', (event) => {
	// KeyboardEvent.code ignores keyboard layout, only cares about physical position.
	__currentlyPressed.add(event.code);
});

window.addEventListener('keyup', (event) => {
	__currentlyPressed.delete(event.code);
});

window.addEventListener('mousemove', (e) => {
	__isMouseInWindow = true;
	__mouseX = e.x;
	__mouseY = e.y;
});

document.body.addEventListener('mouseleave', (e) => {
	__isMouseInWindow = false;
	__currentlyPressed.clear();
});

document.body.addEventListener('mouseenter', (e) => {
	__isMouseInWindow = true;
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
