import engine from 'engine';


class HTMLAutoBorderElement extends HTMLElement {

	/** @type {ResizeObserver} */
	#resizeObserver;


	connectedCallback() {
		const updateCallback = this.update.bind(this);

		this.#resizeObserver = new ResizeObserver(updateCallback);
		this.#resizeObserver.observe(this);

		window.addEventListener('resize', updateCallback);
	}


	disconnectedCallback() {
		if (this.#resizeObserver != null) {
			this.#resizeObserver.disconnect();
			this.#resizeObserver = null;
		}
	}


	update() {
		const rect = this.getBoundingClientRect();

		engine.cameraTarget.borders = {
			top: rect.y,
			right: rect.x + rect.width,
			bottom: rect.y + rect.height,
			left: rect.x,
		};
	}

}


customElements.define('auto-engine-border', HTMLAutoBorderElement);
