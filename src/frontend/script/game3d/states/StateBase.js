import Engine from "../Engine.js";


export default class StateBase {
	playerUser = "Guest";


	constructor() {}

	
	/** @param {Engine} engine */
	enterState(engine) {}


	/** 
	 * @param {Engine} engine
	 * @param {*} newStateType 
	 * @returns {StateBase | null}
	 */
	exitState(engine, newStateType) {
		// Return null to let the engine create the new state,
		// or create it yourself and return it.
		return null;
	}
}