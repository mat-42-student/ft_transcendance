import * as THREE from 'three';


export default class DebugBoard extends THREE.Box3Helper {
	/**
	 *
	 * @param {THREE.Vector2} size
	 */
	constructor(size) {
		const box = new THREE.Box3().setFromCenterAndSize(
			new THREE.Vector3(),
			new THREE.Vector3(size.x, 0, size.y),
		);
		// debugger
		super(box, new THREE.Color('#ffffff'));
	}
}