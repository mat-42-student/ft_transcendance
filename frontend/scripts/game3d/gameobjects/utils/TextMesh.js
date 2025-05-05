import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';


export default class TextMesh extends THREE.Mesh {

	font = state.engine.font;
	size = 0.08;
	depth = 0.01;
	curveSegments = 12;
	bevelEnabled = false;
	bevelThickness = 10;
	bevelSize = 8;
	bevelOffset = 0;
	bevelSegments = 5;

	centerH = true;
	centerV = false;


	/**
	 * @param {THREE.Material} material Material to use. Remember to dispose it.
	 * @param {string} text
	 */
	constructor(material, text = null, centerH = true, centerV = false) {
		super(new THREE.BufferGeometry(), material);

		this.centerH = centerH;
		this.centerV = centerV;

		if (text != null)
			this.setText(text);
	}


	/** @param {string} newText */
	setText(newText) {
		if (this.#oldText == newText)
			return;  // skip, optimization
		this.#oldText = newText;

		if (this.geometry != null) {
			this.geometry.dispose();
			this.geometry = null;
		}

		this.geometry = new TextGeometry(
			newText,
			{
				font: this.font,
				size: this.size,
				depth: this.depth,
				curveSegments: this.curveSegments,
				bevelEnabled: this.bevelEnabled,
				bevelThickness: this.bevelThickness,
				bevelSize: this.bevelSize,
				bevelOffset: this.bevelOffset,
				bevelSegments: this.bevelSegments,
			}
		);

		if (this.centerH || this.centerV) {
			this.geometry.computeBoundingBox();
			const center = this.geometry.boundingBox.getCenter(new THREE.Vector3());
			const offsetH = this.centerH ? -center.x : 0;
			const offsetV = this.centerV ? -center.y : 0;
			// unnecessarily expensive compared to setting transform on child object but uhhh who cares
			this.geometry.translate(offsetH, offsetV, 0);
		}
	}


	dispose() {
		if (this.geometry) this.geometry.dispose();
	}


	#oldText = null;

}