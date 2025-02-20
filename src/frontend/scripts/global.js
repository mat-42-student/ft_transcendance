import { state } from "./main.js";
import * as THREE from 'three';


export default {
	// MARK: Values


	_90: THREE.MathUtils.degToRad(90),
	_180: THREE.MathUtils.degToRad(180),
	_270: THREE.MathUtils.degToRad(270),
	_360: THREE.MathUtils.degToRad(360),


	// MARK: Functions

	// REVIEW this function is unused at the time of writing this comment. Delete?
	randomInRange(a, b) {
		let range = Math.random() < 0.5 ? [-b, -a] : [a, b];
		return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
	},


	clamp(value, min, max) {
		if (value < min)
			return min;
		else if (value > max)
			return max;
		return value;
	},

	/**
	 * https://www.rorydriscoll.com/2016/03/07/frame-rate-independent-damping-using-lerp/
	 * @param {number | THREE.Vector3 | THREE.Quaternion} source
	 * @param {number | THREE.Vector3 | THREE.Quaternion} target
	 * @param {number} speed Must be positive, higher number = faster.
	 * @param {number} delta
	 */
	damp(source, target, speed, delta) {
		if (speed < 0) throw RangeError("Parameter 'speed' must be positive.");

		const t = 1 - Math.exp(-speed * delta);

		// Assuming [source] and [target] are the same type...
		switch (source.constructor.name) {
			case "Number":
				return THREE.MathUtils.lerp(source, target, t);
			case "Vector3":
				return new THREE.Vector3().lerpVectors(source, target, t);
			case "Quaternion":
				return new THREE.Quaternion().slerpQuaternions(source, target, t);
			default:
				throw Error("Unsupported type");
		}
	},

	get powersave() {
		return state.gameApp == null && !document.hasFocus();
	},

	/**
	 * https://processing.org/reference/map_.html
	 * @param {number} input
	 * @param {number} inMin
	 * @param {number} inMax
	 * @param {number} outMin
	 * @param {number} outMax
	 * @returns
	 */
	map(input, inMin, inMax, outMin, outMax) {
		// return outMin + (outMax - outMin) * (input - inMin) / (inMax - inMin);
		return outMin + (input - inMin) / (inMax - inMin) * (outMax - outMin);
	},


	makeLookDownQuaternion(yawDegrees, pitchDegrees) {
		const q_yaw = new THREE.Quaternion().setFromAxisAngle(
			new THREE.Vector3(0, 1, 0),
			THREE.MathUtils.degToRad(yawDegrees)
		);

		const q_pitch = new THREE.Quaternion().setFromAxisAngle(
			new THREE.Vector3(1, 0, 0),
			THREE.MathUtils.degToRad(-pitchDegrees)
		);

		return q_yaw.multiply(q_pitch);
	},
}
