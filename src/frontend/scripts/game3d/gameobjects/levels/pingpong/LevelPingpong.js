import { state } from '../../../../main.js';
import * as THREE from 'three';
import * as UTILS from '../../../../utils.js';
import LevelBase from '../LevelBase.js';
import SceneOriginHelper from '../../utils/SceneOriginHelper.js';
import PingpongBall from './PingpongBall.js';
import PingpongPaddle from './PingpongPaddle.js';


export const BALL_DIAMETER = 0.02;
export let bounceAnimationHeight = 0.3;


export default class LevelPingpong extends LevelBase {


	gltfToDispose = [];


	onAdded() {
		super.onAdded();

		this.boardSize = new THREE.Vector2(1.8, 1);
		this.name = 'Pingpong Level';

		this.background = new THREE.Color('#999999');
		this.fog = null;  //REVIEW https://threejs.org/docs/index.html#api/en/scenes/FogExp2
		this.add(new SceneOriginHelper());
		this.add(new THREE.AmbientLight( 0xffffff, 0.8 ));
		this.add(new THREE.DirectionalLight( 0xffffff, 0.8 ));

		{  //TODO change values, these are copied from LevelDebug
			this.views.position[2].set(0, 1.2, -0.8);
			this.views.quaternion[2].copy(UTILS.makeLookDownQuaternion(180, 60));
			this.views.fov[2] = 80;

			this.views.position[0].set(1.4, 1.2, 0);
			this.views.quaternion[0].copy(UTILS.makeLookDownQuaternion(90, 45));
			this.views.fov[1] = this.views.fov[0] = 60;

			this.views.position[1].copy(this.views.position[0]).x *= -1;
			this.views.quaternion[1].copy(UTILS.makeLookDownQuaternion(-90, 45));

			this.smoothCamera.smoothSpeed = 10;
			this.smoothCamera.mousePositionMultiplier.setScalar(0.2);
			this.smoothCamera.mouseRotationMultiplier.setScalar(0.2);
		}

		this.remainingToLoad = 3;

		state.engine.gltfLoader.load('/ressources/3d/level_pingpong/paddle.glb', (gltf) => {
			const scene = gltf.scene;
			this.gltfToDispose.push(scene);
			this.loadComplete();

			UTILS.materialAutoChangeHierarchy(scene);
			this.add(new PingpongPaddle(0, scene.clone()));
			this.add(new PingpongPaddle(1, scene.clone()));
		});

		state.engine.gltfLoader.load('/ressources/3d/level_pingpong/ball.glb', (gltf) => {
			const scene = gltf.scene;
			this.gltfToDispose.push(scene);
			this.loadComplete();

			UTILS.materialAutoChangeHierarchy(scene);
			this.add(new PingpongBall(scene));
		});

		state.engine.gltfLoader.load('/ressources/3d/level_pingpong/environment.glb', (gltf) => {
			const scene = gltf.scene;
			this.gltfToDispose.push(scene);
			this.loadComplete();

			UTILS.materialAutoChangeHierarchy(scene);
			this.add(scene);
		});
	}


	dispose() {
		super.dispose();

		this.gltfToDispose.forEach(gltf => {
			UTILS.disposeHierarchy(gltf);
		});
		//REVIEW placeholder
	}


	loadComplete() {
		this.remainingToLoad--;

		if (this.remainingToLoad === 0) {
			if (state.gameApp && state.gameApp.level && state.gameApp.level === this) {
				state.engine.scene = this;
			} else {
				state.engine.showErrorScene();
				this.dispose();
			}
		} else if (this.remainingToLoad < 0) {
			throw new Error();
		}
	}


	namesReady() {
		//TODO show usernames
	}


	pause(time) {
		super.pause(time);
		//TODO show countdown
	}

	unpause() {
		if (super.unpause()) {
			//TODO show countdown ended
		}
	}

	endShowWinner(
		scores = [NaN, NaN],
		winner = NaN,
		playerNames = ['?1', '?2'],
	) {
		super.endShowWinner(scores, winner, playerNames);

		if (!state.engine.scene)  // Game end before loading completed. Just give up
			return;

		//TODO endShowWinner
	}

	endShowWebOpponentQuit(opponentName) {
		super.endShowWebOpponentQuit(opponentName);

		if (!state.engine.scene)  // Game end before loading completed. Just give up
			return;

		//TODO endShowWebOpponentQuit
	}

	endShowYouRagequit() {
		super.endShowYouRagequit();

		if (!state.engine.scene)  // Game end before loading completed. Just give up
			return;

		//TODO endShowYouRagequit
	}

	endShowNothing() {
		super.endShowNothing();

		if (!state.engine.scene)  // Game end before loading completed. Just give up
			return;

		//TODO endShowNothing
	}

	endHideResult() {
		super.endHideResult();

		if (!state.engine.scene)  // Game end before loading completed. Just give up
			return;

		//TODO endHideResult
	}


}
