import * as THREE from 'three';
import Engine from "../Engine.js";


export default class StateBase {
	playerUser = "Guest";


	constructor() {}


	/** @param {Engine} engine */
	enterState(engine) {
		engine.scene3.background = new THREE.Color(0,0,0);
		engine.canvas.style.opacity = 0.5;
		
		const p = document.createElement("div");
		p.innerText = 'Warning: State is missing!';
		engine.debugOverlay.appendChild(p);
	}


	/** @param {Engine} engine */
	exitState(engine) {
		engine.canvas.style.opacity = null;
	}
}
