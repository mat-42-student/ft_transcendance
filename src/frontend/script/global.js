import * as THREE from 'three';


export default {
	// MARK: Values


	isPlaying: false,
	gameFrameFunction: null,
	gameCancelFunction: null,

	/** Used for visuals and local games simulation. */
	game: {
		ballPosition: {x: 0, y: 0},
		boardSize: {x: 1.0, y: 1.0},
		scores: [0, 0],
		paddlePositions: [0, 0],
		paddleHeights: [0, 0],
		focusedPlayerIndex: -1,
		playerNames: ['Guest', 'Uninitialized'],
	},


	// MARK: Functions

	randomInRange(a, b) {
		let range = Math.random() < 0.5 ? [-b, -a] : [a, b];
		return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
	},

	async inject_code_into_markup(htmlfile, markup, script) {
		try {
			const response = await fetch(htmlfile);
			const content = await response.text();
			document.querySelector(markup).innerHTML = content;
		} catch (error) {
			console.error("Erreur lors du chargement du fichier :", error);
		}
		if (script)
			addScript(script);
	},

	addScript(file) {
		if (document.getElementById(file))
			return ;
		const newScript = document.createElement('script');
		newScript.src = file;
		newScript.id = file;
		document.body.appendChild(newScript);
	},

	clamp(value, min, max) {
		if (value < min)
			return min;
		else if (value > max)
			return max;
		return value;
	},

	/**
	 * Use this to smoothly interpolate a value over time, regardless of framerate.
	 * (Exponential decay towards parameter "target")
	 * @param {number | THREE.Vector3 | THREE.Quaternion} source
	 * @param {number | THREE.Vector3 | THREE.Quaternion} target
	 * @param {number} speed Must be greater than 1, higher value = faster movement.
	 * @param {number} delta
	 */
	smooth(source, target, speed, delta) {
		if (speed < 1) throw RangeError("Parameter 'speed' should be greater than 1 to get intended behaviour.");
		const time = 1.0 / Math.pow(speed, speed);
		const t = 1 - Math.pow(time, delta);

		if (source.constructor.name !== target.constructor.name) {
			throw Error("Bad arguments");
		}

		switch (source.constructor.name) {
			case "Number":
				return THREE.MathUtils.lerp(source, target, t);
			case "Quaternion":
				const q = new THREE.Quaternion();
				return q.slerpQuaternions(source, target, t);
			case "Vector3":
				const v = new THREE.Vector3();
				return v.lerpVectors(source, target, t);
			default:
				throw Error("Bad arguments");
		}
	},

	smoothRotation(source, target, speed, delta) {
		if (speed < 1) throw RangeError("Parameter 'speed' should be greater than 1 to get intended behaviour.");
		let time = 1.0 / Math.pow(speed, speed);
	},

	get powersave() { return !this.isPlaying && !document.hasFocus(); },
}
