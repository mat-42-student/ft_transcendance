import * as THREE from 'three';
import { state } from "../../../main.js";


/** Why spend 20 seconds manually doing a task that could take 20 minutes to automate? */
export default class BoardAnchor extends THREE.Group {

	left = new THREE.Group();
	right = new THREE.Group();


	constructor(xOffset = 0, yOffset = 0, zOffset = 0, level = null) {
		super();

		this.offset = new THREE.Vector3(xOffset, yOffset, zOffset);

		this.level = (level != null) ? (level) : (state.gameApp.level);

		this.left.position.copy(this.makePosition(0));
		this.right.position.copy(this.makePosition(1));

		this.add(this.left);
		this.add(this.right);
	}


	makePosition(playerIndex) {
		const center = new THREE.Vector3(this.level.boardSize.x / 2, 0, 0);

		const result = center.add(new THREE.Vector3(
			this.offset.x,
			this.offset.y,
			this.offset.z * this.level.boardSize.y / 2
		));

		if (playerIndex == 1)
			result.set(-result.x, result.y, result.z);

		return result;
	}

}
