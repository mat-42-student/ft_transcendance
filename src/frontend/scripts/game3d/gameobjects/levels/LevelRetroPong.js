import * as THREE from 'three';
import LevelComputerBase from "./LevelComputerBase.js";
import TextMesh from '../utils/TextMesh.js';
import { state } from '../../../main.js';


export default class LevelRetroPong extends LevelComputerBase {

	constructor() {
		super(SubsceneRetroPong);
	}

}



class SubsceneRetroPong extends THREE.Scene {

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
