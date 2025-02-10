import { MainSocket } from './MainSocket.js';
import { isAuthenticated } from './api/auth.js';
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

	globalRender() {
		this.renderProfileBtn();
		if (this.state.socialApp)
			this.state.socialApp.fetchFriends();
		if (this.state.chatApp)
			this.state.chatApp.renderChat();
	}

	renderProfileBtn(){
		let label =  "Sign in";
		if (this.state.client.userName)
        	label = this.state.client.userName + '(' + this.state.client.userId + ')';
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

	async refreshSession() {
		if (this.accessToken && isAuthenticated()) {
			return;
		}
		try {
			const response = await fetch('api/v1/auth/refresh/', {
				method: 'POST',
				credentials: 'include'
			});
			if (!response.ok) throw new Error("Could not refresh token");
	
			const data = await response.json();
			try {
				this.state.client.login(data.accessToken);
			}
			catch (error) {
				console.error(error);
			}
			window.location.hash = '#profile';
			// console.log("Session successfully restored");
		} catch (error) {
			console.log(error);
		}
	}
}