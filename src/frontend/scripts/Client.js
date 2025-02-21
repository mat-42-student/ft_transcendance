import { MainSocket } from './MainSocket.js';

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
    }

    async login(token) {
        this.accessToken = token;
        try {
            this.fillUserDataFromJWT();
        } catch (error) {
            console.error(error);
            throw error;
        }
        this.renderProfileBtn();
        this.state.mainSocket = new MainSocket();
        await this.state.mainSocket.init();
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

    async globalRender() {
        this.renderProfileBtn();
        if (this.state.socialApp) {
            await this.state.socialApp.fetchFriends();
            await this.state.socialApp.getInfos();
        }
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

    async refreshSession(location = null) {
        // const cookie = await this.hasCookie();
        // if (this.accessToken || !cookie) {
        //     return;
        // }
        try {
            const response = await fetch('api/v1/auth/refresh/', {
                method: 'POST',
                credentials: 'include'
            });
            if (!response.ok) {
                // console.log('request error!');
                throw new Error("Could not refresh token");
            }
            const data = await response.json();
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

	updateProfilePage() {
		const avatarElement = document.querySelector('.profile-avatar');
		const usernameElement = document.querySelector('.profile-username');
		const statusElement = document.querySelector('.profile-status');
	
		if (avatarElement) {
			avatarElement.src = this.avatar ? `/media/avatars/${this.avatar}` : '/media/avatars/default.png';
		}
	
		if (usernameElement) {
			usernameElement.textContent = this.userName || 'Unknown User';
		}
	
		if (statusElement) { // à changer
			statusElement.classList.remove('online', 'offline', 'ingame', 'pending');
			statusElement.classList.add(this.status || 'online');
	
			const messageElement = statusElement.querySelector('.message');
			if (messageElement) {
				messageElement.textContent = this.status.charAt(0).toUpperCase() + this.status.slice(1);
			}
		}
	}

	async fetchUserProfile() {
		if (!this.accessToken) {
			console.error("No access token found.");
			return;
		}
	
		try {
			const response = await fetch(`/api/v1/users/${this.userId}/`, {
				headers: {
					'Authorization': `Bearer ${this.accessToken}`,
				},
			});
	
			if (response.ok) {
				const data = await response.json();
				this.userName = data.username;
				this.avatar = data.avatar;
				this.status = data.status; // changer gestion status par full front + ws pour echange entre users
				// console.log("Status reçu :", data.status); //debug
				this.updateProfilePage();
			} else {
				console.error("Failed to fetch user profile:", response.status);
			}
		} catch (error) {
			console.error("Error fetching user profile:", error);
		}
	}
}