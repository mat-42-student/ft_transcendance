import { state } from "./main.js";
import * as THREE from 'three';


export const RAD90 = THREE.MathUtils.degToRad(90);
export const RAD180 = THREE.MathUtils.degToRad(180);
export const RAD270 = THREE.MathUtils.degToRad(270);
export const RAD360 = THREE.MathUtils.degToRad(360);


export function cleanErrorMessage() {
    const loginErrorContainer = document.getElementById('auth-error');
    loginErrorContainer.textContent = "";
    loginErrorContainer.classList.add('hidden');
}


/**
 * https://processing.org/reference/map_.html
 * @param {number} input
 * @param {number} inMin
 * @param {number} inMax
 * @param {number} outMin
 * @param {number} outMax
 * @returns
 */
export function map(input, inMin, inMax, outMin, outMax) {
    return outMin + (input - inMin) / (inMax - inMin) * (outMax - outMin);
}


/**
 * https://www.rorydriscoll.com/2016/03/07/frame-rate-independent-damping-using-lerp/
 * @param {number | THREE.Vector3 | THREE.Quaternion} source
 * @param {number | THREE.Vector3 | THREE.Quaternion} target
 * @param {number} speed Must be positive, higher number = faster.
 * @param {number} delta
 */
export function damp(source, target, speed, delta) {
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
}


export function makeLookDownQuaternion(yawDegrees, pitchDegrees) {
    const q_yaw = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        THREE.MathUtils.degToRad(yawDegrees)
    );

    const q_pitch = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        THREE.MathUtils.degToRad(-pitchDegrees)
    );

    return q_yaw.multiply(q_pitch);
}


export function shouldPowersave() {
    return state.isPlaying == false && document.hasFocus() == false;
}
