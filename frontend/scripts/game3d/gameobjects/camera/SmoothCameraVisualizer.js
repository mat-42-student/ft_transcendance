import * as THREE from 'three';
import { state } from '../../../main.js';
import SmoothCamera from './SmoothCamera.js';


export class SmoothCameraVisualizer extends THREE.LineSegments {

	/**
	 * @param {SmoothCamera} smoothCamera Pass reference to be stored internally.
	 * @param {number} secondVisualizerDistance
	 */
	constructor(smoothCamera, secondVisualizerDistance = 100) {
		super(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color: 0xffff00}));

		this.vis2 = new THREE.LineSegments(this.geometry, this.material);
		this.vis2.scale.set(secondVisualizerDistance, secondVisualizerDistance, secondVisualizerDistance);
		this.vis2.position.set(0, 0, -(secondVisualizerDistance - 1));

		this.smoothCamera = smoothCamera;
	}


	onAdded() {
		this.add(this.vis2);
	}


	/** Meant to be called every frame directly by the SmoothCamera after it has updated. */
	update(vAspectRatio) {
		this.visible = state.engine.DEBUG_MODE;
		if (!this.visible) {
			return;
		}

		try {
			const offset = new THREE.Vector3(0,0,-1);
			offset.applyQuaternion(this.smoothCamera.camera.quaternion);
			const planeCenter = this.smoothCamera.position.clone().add(offset);

			this.position.copy(this.parent.worldToLocal(planeCenter));
			// this.quaternion.copy(this.smoothCamera.quaternion);

			const fov_mult = __triangle_thing(this.smoothCamera.fov / 2, 1);
			const h = fov_mult /* * 1 */;
			const w = fov_mult * vAspectRatio;
			const corners = [
				new THREE.Vector3( w,  h, 0),
				new THREE.Vector3( w, -h, 0),
				new THREE.Vector3(-w,-h, 0),
				new THREE.Vector3(-w, h, 0),
			];
			const vertices = [
				corners[0], corners[1],
				corners[1], corners[2],
				corners[2], corners[3],
				corners[3], corners[0],

				// corners[0], corners[2],
				// corners[1], corners[3],
			];

			this.geometry.setFromPoints(vertices);

		} catch (error) {
			// catch because we can't afford this to interrupt the rest of the website
			console.error(' 🥺   uh oh\n👉👈  this is not supposed to happen');
		}
	}


	dispose() {
		this.geometry.dispose();
		this.material.dispose();
	}

}


// MARK: Utils

function __triangle_thing(angle_deg, side_a) {
	const hypothenuse = side_a / Math.cos(THREE.MathUtils.degToRad(angle_deg));
	return Math.sqrt(hypothenuse*hypothenuse - side_a*side_a);
}
