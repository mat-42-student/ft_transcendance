import { state } from "./main.js";
import * as THREE from 'three';


export const RAD90 = THREE.MathUtils.degToRad(90);
export const RAD180 = THREE.MathUtils.degToRad(180);
export const RAD270 = THREE.MathUtils.degToRad(270);
export const RAD360 = THREE.MathUtils.degToRad(360);

export function getAvatarPath(avatar) {
    let avatarPath;

    if (avatar === '/media/default.png') {
        avatarPath = avatar;
    } else if (avatar.includes('/media/')) {
        avatarPath = avatar;
    } else {
        avatarPath = `/media${avatar}`;
    }

    // console.log(`avatar og path: ${avatar} -> ${avatarPath}`);
    return avatarPath;
}

export function mainErrorMessage(message) {
    let errorBox = document.getElementById('global-error-box');

    if (!errorBox) {
        return;
    }

    if (!errorBox) {
        errorBox = document.createElement('div');
        errorBox.id = 'global-error-box';
        errorBox.style.position = 'fixed';
        errorBox.style.top = '20px';
        errorBox.style.left = '50%';
        errorBox.style.transform = 'translateX(-50%)';
        errorBox.style.zIndex = '9999';
        errorBox.style.padding = '12px 24px';
        errorBox.style.backgroundColor = '#f44336';
        errorBox.style.color = 'white';
        errorBox.style.borderRadius = '4px';
        errorBox.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
        errorBox.style.fontSize = '16px';
        errorBox.style.maxWidth = '90%';
        errorBox.style.textAlign = 'center';
        errorBox.style.display = 'none';
        document.body.appendChild(errorBox);
    }

    errorBox.textContent = message;
    errorBox.style.display = 'block';

    setTimeout(() => {
        errorBox.style.display = 'none';
    }, 3000);
}

export function cleanErrorMessage() {
    const loginErrorContainer = document.getElementById('auth-error');

    if (!loginErrorContainer) {
        return;
    }

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
export function autoMaterial(obj) {
    if (obj instanceof THREE.Material)
    {
        // if (obj.wireframe !== undefined) obj.wireframe = true;  // Useful for testing
        obj.dithering = true;

        getTexturesInMaterial(obj).forEach((tex) => {
            tex.generateMipmaps = false;
            tex.minFilter = tex.magFilter = THREE.LinearFilter;
        })
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
 * @param {THREE.Object3D} obj Object hierarchy, will be traversed recursively.
 * @param {string} materialName
 * @returns {THREE.Material?}
 */
export function findMaterialInHierarchy(obj, materialName) {
    if (!(obj instanceof THREE.Object3D))
        throw Error("Bad function argument 1");

    if (typeof materialName != "string" || materialName == "")
        throw Error("Bad function argument 2");

    let result = null;

    obj.traverse((currentObj) => {
        if (currentObj.material instanceof Array) {
            if (currentObj.material instanceof Array) {

                currentObj.material.forEach((currentMaterial) => {
                    if (currentMaterial.name == materialName) {
                        result = currentMaterial
                        return;
                    }
                });

            }
        } else if (currentObj.material instanceof THREE.Material && currentObj.material.name == materialName) {

            result = currentObj.material;
            return;

        }
    });

    return result;
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


export function getTexturesInMaterial(mat)
{
    if (mat instanceof THREE.Material) {
        let textures = new Set();

        if (mat.map)              textures.add(mat.map);
        if (mat.lightMap)         textures.add(mat.lightMap);
        if (mat.bumpMap)          textures.add(mat.bumpMap);
        if (mat.normalMap)        textures.add(mat.normalMap);
        if (mat.specularMap)      textures.add(mat.specularMap);
        if (mat.envMap)           textures.add(mat.envMap);
        if (mat.alphaMap)         textures.add(mat.alphaMap);
        if (mat.aoMap)            textures.add(mat.aoMap);
        if (mat.displacementMap)  textures.add(mat.displacementMap);
        if (mat.emissiveMap)      textures.add(mat.emissiveMap);
        if (mat.gradientMap)      textures.add(mat.gradientMap);
        if (mat.metalnessMap)     textures.add(mat.metalnessMap);
        if (mat.roughnessMap)     textures.add(mat.roughnessMap);

        return [...textures];
    }

    return [];
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

    getTexturesInMaterial(mat).forEach((tex) => {
        tex.dispose();
    });

    mat.dispose();
}
