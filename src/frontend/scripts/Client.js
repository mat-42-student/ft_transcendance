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

    async logout() {
        this.userId = null;
        this.userName = null;
        this.accessToken = null;
        if (this.state.mainSocket)
            this.state.mainSocket.close(); // handles sub-objects (social, chat, mmaking) closure
        this.state.mainSocket = null;
        this.renderProfileBtn();

        try {
            const response = await fetch('/api/v1/auth/logout/', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Logout failed');
            }
    
            window.location.hash = '#home';
        } catch (error) {
            console.error('Error:', error);
        }
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

    async hasCookie() {
        try {
            const response = await fetch('api/v1/auth/refresh/', {
                method: 'HEAD',
                credentials: 'include'
            });
            return (response.status == 200)
        } catch {
            return false;
        }
    }

    async refreshSession() {
        const cookie = await this.hasCookie();
        if (this.accessToken || !cookie) {
            return;
        }
        try {
            const response = await fetch('api/v1/auth/refresh/', {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                console.log('request error!');
                throw new Error("Could not refresh token");
            }
            const data = await response.json();
            try {
                this.login(data.accessToken);
            }
            catch (error) {
                console.warn(error);
            }
            window.location.hash = '#profile';
            console.log("Session successfully restored");
        } catch (error) {
            // console.warn(error);
        }
    }
}