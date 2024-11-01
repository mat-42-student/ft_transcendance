import * as THREE from 'three';


export default class Cross2DHelper extends THREE.LineSegments {

	/**
	 * @param {THREE.ColorRepresentation} color
	 */
	constructor(color) {
		const geo = new THREE.BufferGeometry();

		const mat = new THREE.LineBasicMaterial({color: color});
		super(geo, mat);
	}


	dispose() {
		super.dispose();
	}
}


const verts =[
	-1, 0, 0,	1, 0, 0,
	0, -1, 0,	0, 1, 0,
	0, 0, -1,	0, 0, 1
];
