import { MainSocket } from './MainSocket.js';

export class Client{

	constructor() {
		this.userId = null;
        this.userName = null;
		this.accessToken = null;
		this.state = null;
	}

	setState(state) {
		this.state = state;
	}

    login(token) {
        this.accessToken = token;
        try {
            this.fillUserDataFromJWT();
        } catch (error) {
            console.error(error);
            throw error;
        }
        this.renderProfileBtn();
        this.state.mainSocket = new MainSocket();
    }

    logout() {
        this.userId = null;
        this.userName = null;
		this.accessToken = null;
        this.state.mainSocket.close(); // handles sub-objects (social, chat, mmaking) closure
        this.state.mainSocket = null;  
        this.renderProfileBtn();
    }

    // globalRender() {
	// 	this.renderProfileBtn();
	// 	this.state.socialApp.displayFriendsList();
	// 	this.state.chatApp.renderChat();
	// }

	renderProfileBtn(){
        const label = this.state.client.userName || "Sign in";
    	document.getElementById('btn-profile').innerText = label;
	}

	fillUserDataFromJWT() {
		if (this.state.client.accessToken == null) {
			throw new Error('Token not found');
		}
		const parts = this.state.client.accessToken.split('.');
		if (parts.length !== 3) {
		  throw new Error('Invalid JWT format');
		}
		const payload = parts[1];
		const decodedPayload = atob(payload);
		const parsedPayload = JSON.parse(decodedPayload);
		this.state.client.userId = parsedPayload.id;
		this.state.client.userName = parsedPayload.username;
	}
}