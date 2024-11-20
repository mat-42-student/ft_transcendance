import * as THREE from 'three';
import engine from 'engine';
import global from 'global';


export default class Ball extends THREE.Group {

	// Empty for now, we can just set the 3d position -
	// but this will define a common interface eventually.

	onFrame(delta, time) {
		this.position.x = global.game.ballPosition.x;
		this.position.z = global.game.ballPosition.y;
	}
}
