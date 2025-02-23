import { state } from "./main.js";


export class Input {

	// MARK: Private

	#pressed = new Set([]);
	#mouseX = 0;
	#mouseY = 0;
	#isMouseInWindow = false;


	// MARK: Public

	constructor() {
		window.addEventListener('keydown', (event) => {
			// KeyboardEvent.code ignores keyboard layout, only cares about physical position.
			this.#pressed.add(event.code);
		});

		window.addEventListener('keyup', (event) => {
			this.#pressed.delete(event.code);
		});

		window.addEventListener('mousemove', (e) => {
			this.#isMouseInWindow = true;
			this.#mouseX = e.x;
			this.#mouseY = e.y;
		});

		document.body.addEventListener('mouseleave', (e) => {
			this.#isMouseInWindow = false;
			this.#pressed.clear();
		});

		document.body.addEventListener('mouseenter', (e) => {
			this.#isMouseInWindow = true;
		});
	}

	get pressed() { return this.#pressed; }

	get mouseX() { return this.#mouseX; }
	get mouseY() { return this.#mouseY; }
	get isMouseInWindow() { return this.#isMouseInWindow; }

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
			- Number(this.#pressed.has(keybinds.negative))
			+ Number(this.#pressed.has(keybinds.positive))
		);
	}

}
