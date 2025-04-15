import { state } from '../main.js';
import { MainSocket } from './MainSocket.js';
import { verifyToken } from '../api/auth.js';
import { resetPendingCountDisplay } from '../components/friend_requests.js';

export class Client{

    constructor() {
        this.userId = null;
        this.userName = null;
        this.accessToken = null;
        this.state = null;
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
            console.error(error);
            throw error;
        }
        localStorage.setItem('cookieSet', true); // modfis ajoutées après merge
		if (this.state.mainSocket == null)
		{
        	this.state.mainSocket = new MainSocket();
        	await this.state.mainSocket.init();
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
              
            localStorage.removeItem('cookieSet'); // modfis ajoutées après merge
            window.location.hash = '#home';
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async globalRender() {
        if (this.state.socialApp) {
            await this.state.socialApp.fetchFriends();
            await this.state.socialApp.getInfos();
            await this.state.socialApp.getPendingCount();
        }
        if (this.state.chatApp)
            this.state.chatApp.renderChat();
        if (this.state.mmakingApp)
            await this.state.mmakingApp.renderMatchmaking();
        this.renderProfileBtn();
    }

    renderProfileBtn() {
        const profileLink = document.getElementById('profile-link');
        const statusIndicator = document.querySelector('.user-status');
    
        let label = "Sign in";
    
        if (this.state.client.userName)
            label = `${this.state.client.userName} (${this.state.client.userId})`;
    
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
        const payload = parts[1];
        const decodedPayload = atob(payload);
        const parsedPayload = JSON.parse(decodedPayload);
        this.state.client.userId = parsedPayload.id;
        this.state.client.userName = parsedPayload.username;
    }

    async refreshSession(location = null) {
        if (!localStorage.getItem('cookieSet')) // modfis ajoutées après merge
            return;                              // modfis ajoutées après merge
        try {
            const response = await fetch('api/v1/auth/refresh/', {
                method: 'POST',
                credentials: 'include'
            });
            if (!response.ok) {
                // console.log('request error!');
                // localStorage.removeItem('cookieSet'); // modfis ajoutées après merge
                throw new Error("Could not refresh token");
            }
            const data = await response.json();
            localStorage.setItem('cookieSet', true);
            try {
                await this.login(data.accessToken);
            }
            catch (error) {
                console.warn(error);
            }
            if (location)
                window.location.hash = location;
            // console.log("Session successfully restored");
        } catch (error) {
            // console.warn(error);
        }
    }

    // Vérifie si l'utilisateur est authentifié par la présence d'un accessToken
    async isAuthenticated() {
        const token = state.client.accessToken;
        if (!token) return false;
        
        try {
            const response = await verifyToken();
            return response.ok;
        } catch (error) {
            console.error('Erreur lors de la vérification du token:', error);
            return false;
        }
    }
}