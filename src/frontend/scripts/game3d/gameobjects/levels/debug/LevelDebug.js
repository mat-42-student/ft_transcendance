import * as THREE from 'three';
import { state } from '../../../../main.js';
import LevelBase from '../LevelBase.js';
import DebugBall from './DebugBall.js';
import DebugPaddle from './DebugPaddle.js';
import DebugBoard from './DebugBoard.js';
import * as UTILS from '../../../../utils.js';
import DebugScoreIndicator from './DebugScoreIndicator.js';
import SceneOriginHelper from '../../utils/SceneOriginHelper.js';
import BoardAnchor from '../../utils/BoardAnchor.js';
import TextMesh from '../../utils/TextMesh.js';


export default class LevelDebug extends LevelBase {
	constructor() {
		super();

		this.boardSize = new THREE.Vector2(1.5, 1);
		this.name = 'Debug Level';

		this.background = new THREE.Color('#112211');
		this.fog = null;

		{
			this.views.position[2].set(0, 1.2, -0.8);
			this.views.quaternion[2].copy(UTILS.makeLookDownQuaternion(180, 60));
			this.views.fov[2] = 60;

			this.views.position[0].set(1.1, 0.8, 0);
			this.views.quaternion[0].copy(UTILS.makeLookDownQuaternion(90, 45));
			this.views.fov[1] = this.views.fov[0] = 55;

			this.views.position[1].copy(this.views.position[0]).x *= -1;
			this.views.quaternion[1].copy(UTILS.makeLookDownQuaternion(-90, 45));
		}
	}


	onAdded() {
		super.onAdded();

		this.add(new DebugBall());
		this.add(new DebugPaddle(0));
		this.add(new DebugPaddle(1));

		this.add(new DebugBoard());
		this.add(new SceneOriginHelper());

		this.smoothCamera.diagonal = 40;
		this.smoothCamera.mousePositionMultiplier.set(0.1, 0.1);
		this.smoothCamera.mouseRotationMultiplier.set(0.1, 0.1);
		this.smoothCamera.smoothSpeed = 15;

		{
			const top = new BoardAnchor(-0.1, -0.1, 0.8, this);
			const bottom = new BoardAnchor(-0.1, -0.1, -0.8, this);

			this.add(top);
			this.add(bottom);

			top.left.add(new DebugScoreIndicator(0));
			top.right.add(new DebugScoreIndicator(1));

			this.textMaterial = new THREE.MeshBasicMaterial({color: '#334433'});

			this.nameTextMeshes = [
				new TextMesh(this.textMaterial, '???'),
				new TextMesh(this.textMaterial, '???')
			]
			bottom.left.add(this.nameTextMeshes[0]);
			bottom.right.add(this.nameTextMeshes[1]);
			this.nameTextMeshes.forEach((nameTextMesh) => {
				nameTextMesh.scale.setScalar(0.5);
			})

			const toRotate = [top.left, top.right, bottom.left, bottom.right];
			toRotate.forEach(
				(object3d) => {
					object3d.rotateY(UTILS.RAD180);
					object3d.rotateX(- UTILS.RAD90);
				}
			);

			this.flipFunction = () => {
				toRotate.forEach((object3d) => {
					let facing = 0;
					switch (this.viewIndex) {
						case 0:
							facing = UTILS.RAD90;
						case 1:
							facing = -UTILS.RAD90;
					}
					object3d.rotateZ(facing)
				});
			}
		}
	}


	onFrame(delta, time) {
		super.onFrame(delta, time);

		if (this.gameInitialized != true && state.gameApp != null) {
			this.gameInitialized = true;
			this.nameTextMeshes[0].setText(state.gameApp.playerNames[0]);
			this.nameTextMeshes[1].setText(state.gameApp.playerNames[1]);
			this.flipFunction();
		}
	}


	dispose() {
		super.dispose();

		if (this.textMaterial) this.textMaterial.dispose();
	}


	pause(time) {
		super.pause(time);
		//TODO show something on screen
	}


	unpause() {
		if (super.unpause()) {
			//TODO show something on screen
		}
	}

}
