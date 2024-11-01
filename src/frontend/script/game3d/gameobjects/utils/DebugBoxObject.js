import * as THREE from 'three';
import engine from 'engine';
import * as GAMEOBJECTS from 'gameobjects';


export default class DebugBoxObject extends THREE.Object3D {

	/**
	 * Append stuff here.
	 * @type {HTMLDivElement}
	 */
	html_div;


	onAdded() {
		div = document.createElement('div');
		engine.html_debugBox.appendChild(this.html_div);
	}


	dispose() {
		engine.html_debugBox.removeChild(this.html_div);
		this.html_div = undefined;
	}
}
