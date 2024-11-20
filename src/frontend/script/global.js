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
	 * https://www.rorydriscoll.com/2016/03/07/frame-rate-independent-damping-using-lerp/
	 * @param {number | THREE.Vector3 | THREE.Quaternion} source
	 * @param {number | THREE.Vector3 | THREE.Quaternion} target
	 * @param {number} speed Must be positive, higher number = faster.
	 * @param {number} delta
	 */
	damp(source, target, speed, delta) {
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
	},

	get powersave() { return !this.isPlaying && !document.hasFocus(); },
}
