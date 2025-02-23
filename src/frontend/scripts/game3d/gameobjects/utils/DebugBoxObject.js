import * as THREE from 'three';
import { state } from '../../../main.js';


export default class DebugBoxObject extends THREE.Object3D {

	constructor() {
		super();

		/** Append stuff here. @type {HTMLDivElement} */
		this.html_div = document.createElement('div');
		state.engine.html_debugBox.appendChild(this.html_div);
	}


	dispose() {
		state.engine.html_debugBox.removeChild(this.html_div);
		this.html_div = null;
	}
}
