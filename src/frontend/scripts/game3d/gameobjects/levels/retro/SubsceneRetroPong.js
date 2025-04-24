import * as THREE from 'three';
import TextMesh from '../../utils/TextMesh.js';
import { state } from '../../../../main.js';


export default class SubsceneRetroPong extends THREE.Scene {

	constructor(parentScene) {
		super();
		this.parentScene = parentScene;
	}

	onAdded() {
		this.background = new THREE.Color("#007700");

		this.add(new THREE.AmbientLight("#ff00ff", 1));  // just in case i accidentally have a lit material

		this.whiteMaterial = new THREE.MeshBasicMaterial({color: "#ffffff"});
	}

	onFrame(delta, time) {
	}

	dispose() {
		if (this.whiteMaterial) this.whiteMaterial.dispose();
	}

}
