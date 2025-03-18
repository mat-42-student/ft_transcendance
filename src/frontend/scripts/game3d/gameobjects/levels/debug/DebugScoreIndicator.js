import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { state } from "../../../../main.js";
import ScoreIndicator from '../../gameplay/ScoreIndicator.js';
import Cross2DHelper from '../..//utils/Cross2DHelper.js';


const SIZE = 0.05;
const CORNER_DISTANCE = SIZE/2 + 0.01;


export default class DebugScoreIndicator extends ScoreIndicator {

	#textMesh;

	#colorFlashInterpolator = 0.0;

	#playerMult;


	constructor(playerIndex) {
		super(playerIndex);
		this.#playerMult = this.playerIndex == 0 ? 1 : -1;
	}


	onAdded() {
		const half = SIZE / 2;

		const boxMin = new THREE.Vector3(
			-half,
			-half,
			-half
		);

		const boxMax = new THREE.Vector3(
			-boxMin.x,
			-boxMin.y,
			SIZE * 5 - half,
		);

		this.#material = new THREE.LineBasicMaterial({
			color: new THREE.Color('#0000ff'),
		})

		this.#box = new THREE.Box3Helper(
			new THREE.Box3(boxMin, boxMax),
			new THREE.Color('#ffffff')
		);
		this.#box.material.dispose();
		this.#box.material = this.#material;
		this.add(this.#box);

		this.textGeometry = new TextGeometry( `P${this.playerIndex}`, {
			font: state.engine.font,
			size: 0.08,
			depth: 0.01,
			curveSegments: 12,
		} );
		this.textMesh = new THREE.Mesh(null, new THREE.MeshBasicMaterial({}));
		this.textMesh.position.set(0, -0.1, -0.1);
		this.textMesh.rotateX(-Math.PI/2);
		this.textMesh.rotateZ(Math.PI);
		this.add(this.textMesh);
	}


	onFrame(delta, time) {
		super.onFrame(delta, time);

		if (this.visible) {
			this.#colorFlashInterpolator = Math.max(0, this.#colorFlashInterpolator - delta / 3);
			this.#material.color.lerpColors(
				new THREE.Color(0x444444),
				new THREE.Color(0x44ff44),
				this.#colorFlashInterpolator
			);

			this.position.set(
				this.#playerMult * (state.gameApp.level.boardSize.x / 2 - CORNER_DISTANCE),
				-SIZE / 2,
				-state.gameApp.level.boardSize.y / 2 + CORNER_DISTANCE
			);
		}
	}


	scoreChanged(score) {
		super.scoreChanged(score);
		let missing = score - this.#addedCount;
		if (missing < 0) {
			this.clear();  // eeeeeeh whatever
			this.#addedCount = 0;
			missing = score;
		}
		for (let i = 0; i < missing; i++) {
			this.#addScorePoint();
		}
		this.#colorFlashInterpolator = 1;
	}


	#addScorePoint() {
		const newPoint = new Cross2DHelper(new THREE.Color("#ffff00"));

		newPoint.material.dispose();
		newPoint.material = this.#material;

		newPoint.position.set(
			0,
			0,
			this.#addedCount * SIZE,
		);

		newPoint.rotateOnWorldAxis(
			new THREE.Vector3(1, 0, 0),
			THREE.MathUtils.degToRad(-15)
		);

		newPoint.scale.set(SIZE, SIZE, SIZE);

		this.#addedCount++;
		this.add(newPoint);
	}


	dispose() {
		this.clear();
		this.#box = null;
		this.#material.dispose();
		this.#material = null;
		if (this.textGeometry) this.textGeometry.dispose();
	}
}
