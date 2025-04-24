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
		this.grayMaterial = new THREE.MeshBasicMaterial({color: "#aaaaaa"});

		this.scoreText = [ new TextMesh(this.grayMaterial), new TextMesh(this.grayMaterial) ];
		this.scoreText.forEach((t, i) => {
			this.add(t);
			t.size = 0.2;
			t.depth = 0;
			t.position.set(i ? -0.5 : 0.5, 0.5, -0.1);
			t.setText(`?${i}`);
		});

		this.namesText = [ new TextMesh(this.grayMaterial), new TextMesh(this.grayMaterial), ];
		this.namesText.forEach((t, i) => {
			this.add(t);
			t.size = 0.1;
			t.depth = 0;
			t.position.set(i ? -0.5 : 0.5, -0.8, -0.1);
			t.setText(`?${i}`);
		});
	}

	onFrame(delta, time) {
	}

	dispose() {
		if (this.whiteMaterial) this.whiteMaterial.dispose();
		if (this.grayMaterial) this.grayMaterial.dispose();
	}

}
