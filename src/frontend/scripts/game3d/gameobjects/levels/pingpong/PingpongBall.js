import * as THREE from 'three';
import Ball from '../../gameplay/Ball.js';


export default class PingpongBall extends Ball {

	constructor(model) {
		super();
		this.model = model;
	}


	onAdded() {
		this.add(this.model);
	}


	onFrame(delta, time) {
		super.onFrame(delta, time);

		//TODO rotation
		//TODO bounce anim
	}

}
