import engine from 'engine';


//REVIEW check that this runs
console.log('Registered web component HTMLAutoBorderElement');
customElements.define('auto-engine-border', HTMLAutoBorderElement);


//TODO test and use this entire thing
//TODO is there a way to prevent multiple fighting eachother if more than 1 is created accidentally?
//TODO also test that this doesnt linger when the page is removed/replaced
class HTMLAutoBorderElement extends HTMLElement {

	/** @type {ResizeObserver} */
	#resizeObserver;


	connectedCallback() {
		this.#resizeObserver = new ResizeObserver((entries) => {
			// for (const entry of entries) {
			// 	//TODO do i need this?
			// }
			const rect = this.getBoundingClientRect();

			engine.cameraTarget.borders = {
				top: rect.x,
				right: rect.y + rect.width,
				bottom: rect.x + rect.height,
				left: rect.y,
			};
			console.log('Resize detected');  //REVIEW check that this works
		});

		this.#resizeObserver.observe(this);
	}


	disconnectedCallback() {
		if (this.#resizeObserver != null) {
			this.#resizeObserver.disconnect();
			this.#resizeObserver = null;
		}
	}

}