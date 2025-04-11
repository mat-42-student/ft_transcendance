import { state } from '../main.js';
import { navigator } from '../nav.js';
import { updatePendingCountDisplay } from '../components/friend_requests.js';
import { fetchFriends, fetchPendingCount, fetchReceivedRequests, fetchSentRequests, modifyRelationship } from '../api/users.js';
import { ft_fetch } from '../main.js';

export class SocialApp{

    constructor(){
        this.friendList = null;
        this.myStatus = null;
        this.friendReceivedRequests = new Map();
        this.friendSentRequests = new Map();
        this.pendingCount = 0;
        // this.pollingInterval = null;
    }

    async render() {
        await this.fetchFriends();
        this.getPendingCount();
        await this.getInfos();
		await state.mmakingApp.update_friendList();
    }

    async fetchFriends() {
        if (!state.client.accessToken) {
            console.error("User is not connected");
            return;
        }
        try {
            const response = await ft_fetch('api/v1/users/' + state.client.userId + '/friends/', {
                headers: {
                    'Authorization': `Bearer ${state.client.accessToken}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                const friendsData = data.friends;
                if (!friendsData) {
                    console.error("Error fetching friends: ", friendsData);
                    return;
                }
                this.friendList = new Map(friendsData.map(friend => [friend.id, friend]));
            } else {
                console.error("Error while loading friendList :", response.status);
            }
        } catch (error) {
            console.error("Fetch error: ", error);
        }
        this.displayFriendList();
    }

    getFriend(id) {
        id = Number(id);
        return Number.isInteger(id) ? this.friendList.get(id) : null;
    }

    close() {
        this.removeAllFriendListeners();
        document.querySelector('.friends-list').innerHTML = '<p>Sign in to interact with friends</p>';
        this.friendList = null;
    }

    incomingNotify() {
        // console.log('incomingNotify !');
        this.render();
    }

    incomingMsg(data) {
        if (data.user_id == state.client.userId) {
            this.myStatus = data.status;
            return ;
        }
        let friend = this.friendList.get(data.user_id);
        if (!friend)
            return ;
        friend.status = data.status;
        this.renderFriendStatus(data.user_id);
        if (data.user_id == state.chatApp.activeChatUserId)
            state.chatApp.toggleChatInput(data.status);
    }

    renderFriendStatus(id) {
        const friendItem = document.querySelector(`.friend-item-${id}`);
        if (friendItem) {
            const status = this.friendList.get(id).status
            const statusSpan = friendItem.querySelector('.friend-status');
            statusSpan.classList.remove('online', 'ingame', 'offline', 'pending');
            statusSpan.classList.add(status);
            if (status === 'offline') {
                friendItem.querySelector('.btn-match').classList.add('hidden');
                friendItem.querySelector('.btn-chat').classList.add('hidden');
            } else {
                friendItem.querySelector('.btn-match').classList.remove('hidden');
                friendItem.querySelector('.btn-chat').classList.remove('hidden');
            }
        } else {
            console.warn(`Utilisateur avec user_id ${id} introuvable.`);
        }
    }

    displayFriendList() {
        const htmlFriendList = document.querySelector('.friends-list');
        htmlFriendList.querySelectorAll('.friend-item').forEach(friendItem => {
            const btnChat = friendItem.querySelector('.btn-chat');
            const btnMatch = friendItem.querySelector('.btn-match');
            const username = friendItem.querySelector('.friend-name');
            btnChat.removeEventListener('click', this.handleChatClick);
            btnMatch.removeEventListener('click', this.handleMatchClick);
            username.removeEventListener('click', this.handleUsernameClick);
        });
        htmlFriendList.innerHTML = '';
        if (this.friendList == null || this.friendList.size == 0) {
            htmlFriendList.innerHTML = '<p>I\'m sorry you have no friends</p>';
            return;
        }
        this.friendList.forEach((friend) => this.addFriendEntry(friend, htmlFriendList));
    }

    addFriendEntry(friend, parent) {
        const friendItem = document.createElement('li');
        friendItem.classList.add('friend-item');
        friendItem.innerHTML = `
            <img class="friend-avatar" src="/media/avatars/${friend.avatar}" alt="${friend.username}">
            <div class="friend-info">
                <span class="friend-name">${friend.username}</span>
                <div class="friend-detail" data-user-id="${friend.id}">
                    <span class="friend-status ${friend.status}"></span>
                    <button class="btn-match"><img id=btn-match-picture-${friend.id} src="/ressources/vs.png"></button>
                    <button class="btn-chat"><img src="/ressources/chat.png"></button>
                </div>
            </div>
        `;
        parent.appendChild(friendItem);

        // add data-user-id="${friend.id}" to entire card (Adrien©)
        friendItem.dataset.userid = friend.id;
        friendItem.classList.add(`friend-item-${friend.id}`);

        const btnChat = friendItem.querySelector('.btn-chat');
        const btnMatch = friendItem.querySelector('.btn-match');
        const username = friendItem.querySelector('.friend-name');

        btnChat.dataset.friendId = friend.id;
        btnMatch.dataset.friendId = friend.id;
        
        // add by Adrien
        btnMatch.dataset.invite = 0;
        btnMatch.classList.add(`btn-match-${friend.id}`);
        // btnMatch.addEventListener('click', state.mmakingApp.boundEventListenersFriend[friend.id].btnInviteDesactive);
        btnChat.addEventListener('click', this.handleChatClick);
        username.addEventListener('click', () => this.handleUsernameClick(friend.id));
    }

    async handleChatClick(event) {
        const friendId = event.currentTarget.dataset.friendId;
        await state.chatApp.changeChatUser(friendId);
    }

    handleMatchClick(event) {
        const friendId = event.currentTarget.dataset.friendId;
        state.mmakingApp.btnInviteDesactive(friendId);
    }

    handleUsernameClick(friendId) {
        navigator.goToPage('profile', friendId);
    }

    removeAllFriendListeners() {
        document.querySelectorAll('.friend-item').forEach(friendItem => {
            const btnChat = friendItem.querySelector('.btn-chat');
            const btnMatch = friendItem.querySelector('.btn-match');
            const username = friendItem.querySelector('.friend-name');
            const newUsername = username.cloneNode(true);
    
            btnChat.removeEventListener('click', this.handleChatClick);
            btnMatch.removeEventListener('click', this.handleMatchClick);
            username.parentNode.replaceChild(newUsername, username);
        });
    }

    async notifyUser(userId) {
        console.log("Notifying user", userId);
        let data = {
            "header": {
                "service": "social",
                "dest": "back",
            },
            "body": {
                "status": "notify",
                "id": userId
            }
        };
        try {
            await state.mainSocket.send(JSON.stringify(data));
        } catch (error) {
            console.error("Error sending notify action: ", error);
        }
    }
    
    async getInfos() {
        let data = {
            "header": {
                "service": "social",
                "dest": "back",
            },
            "body":{
                "status": "info"
            }
        };
        try {
            await state.mainSocket.send(JSON.stringify(data));
        } catch (error) {
            console.error("Error sending info request: ", error);
        }
    }

    async getFriends() {
        const friends = await fetchFriends(state.client.userId);
        this.friendList = new Map(friends.map(friend => [friend.id, friend]));
        this.displayFriendList();
    }

    async getReceivedRequests() {
        const receivedRequests = await fetchReceivedRequests();
        this.friendReceivedRequests = new Map(receivedRequests.map(friend => [friend.id, friend]));
    }

    async getSentRequests() {
        const sentRequests = await fetchSentRequests;
        this.friendSentRequests = new Map(sentRequests.map(friend => [friend.id, friend]));
    }

    async getPendingCount() {
        const pendingCount = await fetchPendingCount();
        this.pendingCount = pendingCount;
        updatePendingCountDisplay();
    }

    acceptFriendRequest(userId) {
        return modifyRelationship(userId, 'accept-friend', 'POST');
    }

    rejectFriendRequest(userId) {
        return modifyRelationship(userId, 'remove-friend', 'DELETE');
    }
    
    blockUser(userId) {
        return modifyRelationship(userId, 'block', 'POST');
    }
    
    unblockUser(userId) {
        return modifyRelationship(userId, 'unblock', 'DELETE');
    }

    // startPollingPendingCount(interval = 20000) {
    //     if (this.pollingInterval) return; // Évite de lancer plusieurs fois le polling
    //     this.getPendingCount();  // Mise à jour immédiate avant le premier intervalle
    //     this.pollingInterval = setInterval(() => this.getPendingCount(), interval);
    // }

    // stopPollingPendingCount() {
    //     if (this.pollingInterval) {
    //         clearInterval(this.pollingInterval);
    //         this.pollingInterval = null;
    //     }
    // }
}


// export class SocialApp {
//     constructor() {
//         this.myStatus = null;
//         this.friendList = new Map();
//     }

//     attachEventListeners() {
//         document.querySelectorAll('.friend-item').forEach(friendItem => {
//             const chatBtn = friendItem.querySelector('.btn-chat');
//             const matchBtn = friendItem.querySelector('.btn-match');
//             if (chatBtn) chatBtn.addEventListener('click', this.handleChatClick);
//             if (matchBtn) matchBtn.addEventListener('click', this.handleMatchClick);
//         });
//     }
    
//     removeAllFriendListeners() {
//         document.querySelectorAll('.friend-item').forEach(friendItem => {
//             const chatBtn = friendItem.querySelector('.btn-chat');
//             const matchBtn = friendItem.querySelector('.btn-match');
//             if (chatBtn) chatBtn.removeEventListener('click', this.handleChatClick);
//             if (matchBtn) matchBtn.removeEventListener('click', this.handleMatchClick);
//         });
//     }

//     handleChatClick(event) {
//         state.chatApp.changeChatUser(event.currentTarget.dataset.friendId);
//     }

//     handleMatchClick(event) {
//         state.mmakingApp.invite(event.currentTarget.dataset.friendId, event.currentTarget);
//     }

//     getFriend(id) {
//         id = Number(id);
//         return Number.isInteger(id) ? this.friendList.get(id) : null;
//     }

//     close() {
//         this.removeAllFriendListeners();
//         document.querySelector('.friends-list').innerHTML = '<p>Sign in to interact with friends</p>';
//         this.friendList.clear();
//     }

//     async getInfos() {
//         let data = {
//             "header": { "service": "social", "dest": "back", "id": state.client.userId },
//             "body": { "status": "info" }
//         };
//         await state.mainSocket.send(JSON.stringify(data));
//     }

//     incomingMsg(data) {
//         if (data.user_id == state.client.userId) {
//             this.myStatus = data.status;
//             return;
//         }
//         let friend = this.friendList.get(data.user_id);
//         if (!friend) return;
//         friend.status = data.status;
//         this.renderFriendStatus(data.user_id);
//         if (data.user_id == state.chatApp.activeChatUserId)
//             state.chatApp.toggleChatInput(data.status);
//     }

//     renderFriendStatus(id) {
//         const friendItem = document.querySelector(`.friend-detail[data-user-id="${id}"]`);
//         if (friendItem) {
//             const status = this.friendList.get(id).status;
//             const statusSpan = friendItem.querySelector('.friend-status');
//             statusSpan.classList.remove('online', 'ingame', 'offline', 'pending');
//             statusSpan.classList.add(status);
//             friendItem.querySelector('.btn-match').classList.toggle('hidden', status === 'offline');
//             friendItem.querySelector('.btn-chat').classList.toggle('hidden', status === 'offline');
//         }
//     }

//     displayFriendList() {
//         const htmlFriendList = document.querySelector('.friends-list');
//         htmlFriendList.innerHTML = '';
//         if (!this.friendList.size) {
//             htmlFriendList.innerHTML = '<p>Aucun ami trouvé.</p>';
//             return;
//         }
//         this.friendList.forEach(friend => {
//             const friendItem = document.createElement('li');
//             friendItem.classList.add('friend-item');
//             friendItem.dataset.userId = friend.id;
//             friendItem.innerHTML = `
//                 <img class="friend-avatar" src="/media/avatars/${friend.avatar}" alt="${friend.username}">
//                 <div class="friend-info">
//                     <span class="friend-name">${friend.username}</span>
//                     <div class="friend-detail" data-user-id="${friend.id}">
//                         <span class="friend-status ${friend.status}"></span>
//                         <button class="btn-match" data-friend-id="${friend.id}"><img src="/ressources/vs.png"></button>
//                         <button class="btn-chat" data-friend-id="${friend.id}"><img src="/ressources/chat.png"></button>
//                     </div>
//                 </div>`;
//             htmlFriendList.appendChild(friendItem);
//         });
//         this.attachEventListeners();
//     }
// }