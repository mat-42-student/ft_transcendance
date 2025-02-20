import { state } from "./main.js";


export default {

	get pressed() { return __pressed; },

	get mouseX() { return __mouseX; },
	get mouseY() { return __mouseY; },
	get isMouseInWindow() { return __isMouseInWindow; },

	getPaddleInput(side) {
		const isLocal1v1 = state.gameApp.side == 2;

		const keybinds = [
			{
				positive: isLocal1v1 ? 'KeyW' : 'KeyA',
				negative: isLocal1v1 ? 'KeyS' : 'KeyD'
			},
			{
				positive: isLocal1v1 ? 'ArrowUp' : 'KeyD',
				negative: isLocal1v1 ? 'ArrowDown' : 'KeyA'
			}
		][side];

		// Sum both sides, so that pressing both keys zeroes out. (Casting bool to int)
		return (
			- Number(__pressed.has(keybinds.negative))
			+ Number(__pressed.has(keybinds.positive))
		);
	},

}


let __pressed = new Set([]);
let __mouseX = 0;
let __mouseY = 0;
let __isMouseInWindow = false;


window.addEventListener('keydown', (event) => {
	// KeyboardEvent.code ignores keyboard layout, only cares about physical position.
	__pressed.add(event.code);
});

window.addEventListener('keyup', (event) => {
	__pressed.delete(event.code);
});

window.addEventListener('mousemove', (e) => {
	__isMouseInWindow = true;
	__mouseX = e.x;
	__mouseY = e.y;
});

document.body.addEventListener('mouseleave', (e) => {
	__isMouseInWindow = false;
	__pressed.clear();
});

document.body.addEventListener('mouseenter', (e) => {
	__isMouseInWindow = true;
});
