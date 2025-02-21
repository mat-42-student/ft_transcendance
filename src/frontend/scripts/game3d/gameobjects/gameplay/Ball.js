import * as THREE from 'three';
import { state } from '../../../main.js';


export default class Ball extends THREE.Group {

	constructor() {
		super();

		this.name = 'Ball';
	}


	onFrame(delta, time) {
		this.visible = state.gameApp != null;
		if (this.visible) {
			this.position.x = state.gameApp.ballPosition.x;
			this.position.z = state.gameApp.ballPosition.y;
		}
	}
}
