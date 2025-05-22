import { delay, state, getCookie, deleteCookie } from '../main.js';
import { MainSocket } from './MainSocket.js';
import { verifyToken, displayErrorMessage } from '../api/auth.js';
import { resetPendingCountDisplay } from '../components/friend_requests.js';
import { mainErrorMessage } from '../utils.js';

export class Client{

    constructor() {
        this.userId = null;
        this.userName = null;
        this.userAvatar = null;
        this.accessToken = null;
        this.state = null;
        this.isOauth = null;
    }

    // Avoiding circular imports (main.js/Client.js)
    setState(state) {
        this.state = state;
        this.renderProfileBtn();
    }

    async login(token) {
        this.accessToken = token;
        try {
            this.fillUserDataFromJWT();
        } catch (error) {
            throw error;
        }
		if (this.state.mainSocket == null) {
        	this.state.mainSocket = new MainSocket();
        	this.state.mainSocket.init();
		}
        while ((this.state.mainSocket?.socket?.readyState !== WebSocket.OPEN)
            && (this.state.mainSocket)  // Fix infinite loop
        ) {
            await delay(0.1); // don't hit me
        }
        this.globalRender();
    }

    async logout() {
        resetPendingCountDisplay();
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
            deleteCookie('witnessToken');  
            window.location.hash = '#';
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async globalRender() {
        await this.state?.socialApp?.render();
        this.state?.chatApp?.renderChat();
        await this.state?.mmakingApp?.renderMatchmaking();
        this.renderProfileBtn();
    }

    renderProfileBtn() {
        const profileLink = document.getElementById('profile-link');
        const statusIndicator = document.querySelector('.user-status');
    
        let label = "Sign In";
    
        if (this.state.client.userName)
            label = `${this.state.client.userName}`;
    
        if (profileLink)
            profileLink.textContent = label;
    
        if (statusIndicator) {
            statusIndicator.classList.remove('online', 'ingame', 'offline', 'pending');
            const status = this.state.socialApp?.myStatus;

            if (status)
                statusIndicator.classList.add(status);
            else
                statusIndicator.classList.add('offline');
        }
    }

    fillUserDataFromJWT() {
        if (this.state.client.accessToken == null) {
            throw new Error('Token not found');
        }
        const parts = this.state.client.accessToken.split('.');
        if (parts.length !== 3) {
          throw new Error('Invalid JWT format');
        }
        try{
            const payload = parts[1];
            const decodedPayload = atob(payload);
            const parsedPayload = JSON.parse(decodedPayload);
            this.state.client.userId = parsedPayload.id;
            this.state.client.userName = parsedPayload.username;
            this.state.client.userAvatar = parsedPayload.avatar ?? '/media/default.png';
            this.state.client.isOauth = parsedPayload.oauth ?? false;
        }
        catch (error) {
            throw new Error(error);
        }
    }

    async refreshSession(location = null) {
        const witness = getCookie('witnessToken');
        if (!witness)
            return;
        try {
            const response = await fetch('api/v1/auth/refresh/', {
                method: 'POST',
                credentials: 'include'
            });
            if (!response.ok)
                throw new Error("Could not refresh token");
            const data = await response.json();
            try {
                await this.login(data.accessToken);
            }
            catch (error) {
                displayErrorMessage(error);
            }
            if (location)
                window.location.hash = location;
        } catch (error) {
            mainErrorMessage(error);
        }
    }

    async isAuthenticated() {
        if (!state.client.accessToken)
            return false;
        try {
            const response = await verifyToken();
            return response.ok;
        } catch (error) {
            return false;
        }
    }
}