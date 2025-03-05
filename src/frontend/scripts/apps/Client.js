import { state } from '../main.js';
import { MainSocket } from './MainSocket.js';
import { fetchFriends, fetchSentRequests, fetchReceivedRequests } from '../api/users.js';

export class Client{

    constructor() {
        this.state = null;
        this.userId = null;
        this.userName = null;
        this.accessToken = null;
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
		if (this.state.mainSocket == null)
		{
        	this.state.mainSocket = new MainSocket();
        	await this.state.mainSocket.init();
		}
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
            await fetchFriends();
            state.socialApp.displayFriendList(); // reloca hors de fetchFriends()
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

    // bouger fetch dans api/users.js -> init `data` -> data = fetchProfil() -> if !data = error -> else use data as actual `data`
    // status perso -> state.socialapp.mystatus
    async loadUserProfile(userId) {
    /*
    Nouvelle fonction d'affichage #profile -> gère profil utilisateur authentifié et utilisateurs tiers, affichage dynamic des infos et options
    Si aucun userId ou id == User authentifié setup page profile auth, sinon affichage profil utilisateur tiers (gestion Relationship fonctionelle)
    */
        try {
            if (!userId)
                userId = this.userId;

            const response = await fetch(`api/v1/users/${userId}/profile/`, {
                headers: {
                    "Authorization": `Bearer ${state.client.accessToken}`
                }
            });
    
            if (!response.ok) {
                throw new Error("Erreur lors de la récupération du profil");
            }
    
            const data = await response.json();
    
            // Vérifie que les éléments existent avant de les modifier -> ?? Appliquer même fonctionnement que pour container des actions à celui des infos
            const usernameEl = document.getElementById("profile-username");
            if (usernameEl)
                usernameEl.textContent = data.username;

            const avatarEl = document.getElementById("profile-avatar");
            if (avatarEl)
                avatarEl.src = data.avatar;
            
            const actionsEl = document.getElementById("profile-actions");
            if (actionsEl) {
                // actionsEl.innerHTML = ""; // Nettoyage des boutons

                if (data.is_self) {
                    actionsEl.innerHTML = `
                        <button data-action="2fa" data-user-id="${data.id}" title="Enable Two-Factor Authentication">
                            <img src="/ressources/2fa.svg" alt="Enable 2fa">
                        </button>
                        <button data-action="update" data-user-id="${data.id}" title="Update Profile">
                            <img src="/ressources/update.png" alt="Update Profile">
                        </button>
                        <button data-action="logout" data-user-id="${data.id}" title="Logout">
                            <img src="/ressources/logout.png" alt="Logout">
                        </button>
                    `;
                } else if (data.has_blocked_user) {
                    actionsEl.innerHTML = `<p>Vous avez été bloqué par cet utilisateur.</p>`;
                } else if (data.is_blocked_by_user) {
                    actionsEl.innerHTML = `
                        <p>Vous avez bloqué cet utilisateur.</p>
                        <br>
                        <button data-action="unblock" data-user-id="${data.id}" title="Unblock">
                            <img src="/ressources/unblock.png" alt="Unblock">
                        </button>
                    `;
                } else if (data.is_friend) {
                    actionsEl.innerHTML = `
                        <button data-action="match" data-user-id="${data.id}" title="Match">
                            <img src="/ressources/vs.png" alt="Match">
                        </button>
                        <button data-action="chat" data-user-id="${data.id}" title="Chat">
                            <img src="/ressources/chat.png" alt="Chat">
                        </button>
                        <button data-action="remove-friend" data-user-id="${data.id}" title="Remove Friend">
                            <img src="/ressources/remove-friend.png" alt="Remove Friend">
                        </button>
                        <button data-action="block" data-user-id="${data.id}" title="Block">
                            <img src="/ressources/block.png" alt="Block">
                        </button>
                    `;
                } else {
                    actionsEl.innerHTML = `
                        <button data-action="add-friend" data-user-id="${data.id}" title="Add Friend">
                            <img src="/ressources/add-friend.png" alt="Add a Friend">
                        </button>
                    `;
                }
            }

        } catch (error) {
            console.error("Erreur :", error);
            const actionsEl = document.getElementById("profile-actions");
            if (actionsEl) actionsEl.innerHTML = `<p>Impossible de charger le profil.</p>`;
        }
    }
}