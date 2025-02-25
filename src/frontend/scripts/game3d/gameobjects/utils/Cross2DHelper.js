import * as THREE from 'three';


export default class Cross2DHelper extends THREE.LineSegments {


	/**
	 * @param {THREE.ColorRepresentation} color
	 */
	constructor(color) {
		this.name = 'Cross2DHelper';
		const geo = new THREE.BufferGeometry();
		geo.setFromPoints(verts);

		const mat = new THREE.LineBasicMaterial({color: color});

		super(geo, mat);
	}


	dispose() {
		this.geometry.dispose();
		this.material.dispose();
		this.geometry = this.material = null;
	}
}


const verts =[
	new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(0.5, 0, 0),
	new THREE.Vector3(0, 0, -0.5), new THREE.Vector3(0, 0, 0.5),
];
