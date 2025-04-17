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


/**
 * Automatically change materials according to my own preferences.
 * Intended for GLTF imported materials, where I didnt write code to define them.
 * @param {THREE.Object3D | THREE.Material} obj A hierarchy of Object3D's, that will be recursively affected,
 * or a single material.
 */
//FIXME i am not sure if this is really working, some materials appear unchanged
export function autoMaterial(obj) {
    if (obj instanceof THREE.Material)
    {
        if (obj.wireframe !== undefined) obj.wireframe = true;
        obj.dithering = false;
    }
    else if (obj instanceof THREE.Object3D)
    {
        let materialsListWithDuplicates = [];
        obj.traverse((obj2) => {
            if (obj2.material instanceof Array) {
                materialsListWithDuplicates.push(...obj2.material)
            } else if (obj2.material instanceof THREE.Material) {
                materialsListWithDuplicates.push(obj2.material);
            }
        });

        // This removes any duplicates.
        let materialsList = new Set(materialsListWithDuplicates);

        materialsList.forEach((mat) => {
            if (mat instanceof THREE.Material)  // check just in case, spooky recursion
                autoMaterial(mat);
        });
    }
}


/**
 * Fully dispose a hierarchy of meshes. Intended for GLTF imported models.
 * Recursively disposes child objects.
 * @param {THREE.Object3D} obj
 */
export function disposeHierarchy(obj) {
    if (obj == null)
        return;

    obj.children.forEach((child) => {
        disposeHierarchy(child);
    });
    disposeMesh(obj);
}


/**
 * Fully dispose a Mesh object, and any materials and textures it uses.
 * Assumes that the mesh owns all of those.
 * Does NOT recursively dispose child Object3D's.
 * If there is nothing to dispose, the function will silently skip.
 * @param {THREE.Mesh} obj
 */
export function disposeMesh(obj)
{
    if (!(obj instanceof THREE.Mesh))
        return;

    if (obj.geometry) obj.geometry.dispose();

    if (obj.material && obj.material instanceof Array)
        obj.material.forEach((mat) => { disposeMaterial(mat); });
    else if (obj.material)
        disposeMaterial(obj.material);
}


/**
 * Fully dispose a material and any textures it uses.
 * Assumes that the material owns those textures.
 * If there is nothing to dispose, the function will silently skip.
 * @param {THREE.Material} mat
 */
export function disposeMaterial(mat) {
    if (!(mat instanceof THREE.Material))
        return;

    if (mat.map)              mat.map.dispose ();
    if (mat.lightMap)         mat.lightMap.dispose ();
    if (mat.bumpMap)          mat.bumpMap.dispose ();
    if (mat.normalMap)        mat.normalMap.dispose ();
    if (mat.specularMap)      mat.specularMap.dispose ();
    if (mat.envMap)           mat.envMap.dispose ();
    if (mat.alphaMap)         mat.alphaMap.dispose();
    if (mat.aoMap)            mat.aoMap.dispose();
    if (mat.displacementMap)  mat.displacementMap.dispose();
    if (mat.emissiveMap)      mat.emissiveMap.dispose();
    if (mat.gradientMap)      mat.gradientMap.dispose();
    if (mat.metalnessMap)     mat.metalnessMap.dispose();
    if (mat.roughnessMap)     mat.roughnessMap.dispose();

    mat.dispose();
}
