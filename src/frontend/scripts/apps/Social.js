import { state } from '../main.js';
import { fetchFriends, fetchReceivedRequests, fetchSentRequests, modifyRelationship } from '../api/users.js';

export class SocialApp {
    constructor() {
        this.myStatus = null;
        this.friendList = new Map();
        this.friendReceivedRequests = new Map();
        this.friendSentRequests = new Map();
    }

    attachEventListeners() {
        document.querySelectorAll('.friend-item').forEach(friendItem => {
            const chatBtn = friendItem.querySelector('.btn-chat');
            const matchBtn = friendItem.querySelector('.btn-match');
            if (chatBtn) chatBtn.addEventListener('click', this.handleChatClick);
            if (matchBtn) matchBtn.addEventListener('click', this.handleMatchClick);
        });
    }
    
    removeAllFriendListeners() {
        document.querySelectorAll('.friend-item').forEach(friendItem => {
            const chatBtn = friendItem.querySelector('.btn-chat');
            const matchBtn = friendItem.querySelector('.btn-match');
            if (chatBtn) chatBtn.removeEventListener('click', this.handleChatClick);
            if (matchBtn) matchBtn.removeEventListener('click', this.handleMatchClick);
        });
    }

    handleChatClick(event) {
        state.chatApp.changeChatUser(event.currentTarget.dataset.friendId);
    }

    handleMatchClick(event) {
        state.mmakingApp.invite(event.currentTarget.dataset.friendId, event.currentTarget);
    }

    getFriend(id) {
        id = Number(id);
        return Number.isInteger(id) ? this.friendList.get(id) : null;
    }

    close() {
        this.removeAllFriendListeners();
        document.querySelector('.friends-list').innerHTML = '<p>Sign in to interact with friends</p>';
        this.friendList.clear();
    }

    async getInfos() {
        let data = {
            "header": { "service": "social", "dest": "back", "id": state.client.userId },
            "body": { "status": "info" }
        };
        await state.mainSocket.send(JSON.stringify(data));
    }

    incomingMsg(data) {
        if (data.user_id == state.client.userId) {
            this.myStatus = data.status;
            return;
        }
        let friend = this.friendList.get(data.user_id);
        if (!friend) return;
        friend.status = data.status;
        this.renderFriendStatus(data.user_id);
        if (data.user_id == state.chatApp.activeChatUserId)
            state.chatApp.toggleChatInput(data.status);
    }

    renderFriendStatus(id) {
        const friendItem = document.querySelector(`.friend-detail[data-user-id="${id}"]`);
        if (friendItem) {
            const status = this.friendList.get(id).status;
            const statusSpan = friendItem.querySelector('.friend-status');
            statusSpan.classList.remove('online', 'ingame', 'offline', 'pending');
            statusSpan.classList.add(status);
            friendItem.querySelector('.btn-match').classList.toggle('hidden', status === 'offline');
            friendItem.querySelector('.btn-chat').classList.toggle('hidden', status === 'offline');
        }
    }

    displayFriendList() {
        const htmlFriendList = document.querySelector('.friends-list');
        htmlFriendList.innerHTML = '';
        if (!this.friendList.size) {
            htmlFriendList.innerHTML = '<p>Aucun ami trouvé.</p>';
            return;
        }
        this.friendList.forEach(friend => {
            const friendItem = document.createElement('li');
            friendItem.classList.add('friend-item');
            friendItem.dataset.userId = friend.id;
            friendItem.innerHTML = `
                <img class="friend-avatar" src="/media/avatars/${friend.avatar}" alt="${friend.username}">
                <div class="friend-info">
                    <span class="friend-name">${friend.username}</span>
                    <div class="friend-detail" data-user-id="${friend.id}">
                        <span class="friend-status ${friend.status}"></span>
                        <button class="btn-match" data-friend-id="${friend.id}"><img src="/ressources/vs.png"></button>
                        <button class="btn-chat" data-friend-id="${friend.id}"><img src="/ressources/chat.png"></button>
                    </div>
                </div>`;
            htmlFriendList.appendChild(friendItem);
        });
        this.attachEventListeners();
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
}

// export class SocialApp{

//     constructor(){
//         this.myStatus = null;
//         this.friendList = null;
//         this.friendReceivedRequests = null;
//         this.friendSentRequests = null;
//     }

//     getFriend(id) {
//         id = Number(id);
//         return Number.isInteger(id) ? this.friendList.get(id) : null;
//     }

//     close() {
//         this.removeAllFriendListeners();
//         document.querySelector('.friends-list').innerHTML = '<p>Sign in to interact with friends</p>';
//         this.friendList = null;
//     }

//     incomingMsg(data) {
//         if (data.user_id == state.client.userId) {
//             this.myStatus = data.status;
//             return ;
//         }
//         let friend = this.friendList.get(data.user_id);
//         if (!friend)
//             return ;
//         friend.status = data.status;
//         this.renderFriendStatus(data.user_id);
//         if (data.user_id == state.chatApp.activeChatUserId)
//             state.chatApp.toggleChatInput(data.status);
//     }

//     renderFriendStatus(id) {
//         const friendItem = document.querySelector(`.friend-detail[data-user-id="${id}"]`);
//         if (friendItem) {
//             const status = this.friendList.get(id).status
//             const statusSpan = friendItem.querySelector('.friend-status');
//             statusSpan.classList.remove('online', 'ingame', 'offline', 'pending');
//             statusSpan.classList.add(status);
//             if (status === 'offline') {
//                 friendItem.querySelector('.btn-match').classList.add('hidden');
//                 friendItem.querySelector('.btn-chat').classList.add('hidden');
//             } else {
//                 friendItem.querySelector('.btn-match').classList.remove('hidden');
//                 friendItem.querySelector('.btn-chat').classList.remove('hidden');
//             }
//         } else {
//             console.warn(`Utilisateur avec user_id ${id} introuvable.`);
//         }
//     }

// displayFriendList() {
//     const htmlFriendList = document.querySelector('.friends-list');
//     htmlFriendList.querySelectorAll('.friend-item').forEach(friendItem => {
//         const btnChat = friendItem.querySelector('.btn-chat');
//         const btnMatch = friendItem.querySelector('.btn-match');
//         btnChat.removeEventListener('click', this.handleChatClick);
//         btnMatch.removeEventListener('click', this.handleMatchClick);
//     });
//     htmlFriendList.innerHTML = '';
//     if (this.friendList == null || this.friendList.size == 0) {
//         htmlFriendList.innerHTML = '<p>I\'m sorry you have no friends</p>';
//         return;
//     }
//     this.friendList.forEach((friend) => {
//         const friendItem = document.createElement('li');
//         friendItem.classList.add('friend-item');
//         friendItem.innerHTML = `
//             <img class="friend-avatar" src="/media/avatars/${friend.avatar}" alt="${friend.username}">
//             <div class="friend-info">
//                 <span class="friend-name">${friend.username}</span>
//                 <div class="friend-detail" data-user-id="${friend.id}">
//                     <span class="friend-status ${friend.status}"></span>
//                     <button class="btn-match"><img src="/ressources/vs.png"></button>
//                     <button class="btn-chat"><img src="/ressources/chat.png"></button>
//                 </div>
//             </div>
//         `;
//         htmlFriendList.appendChild(friendItem);

//         // add data-user-id="${friend.id} to entire card (Adrien©)
//         friendItem.dataset.userid = friend.id;

//         const btnChat = friendItem.querySelector('.btn-chat');
//         const btnMatch = friendItem.querySelector('.btn-match');

//         btnChat.dataset.friendId = friend.id;
//         btnMatch.dataset.friendId = friend.id;
//         btnMatch.dataset.invite = 0;

//         btnChat.addEventListener('click', this.handleChatClick);
//         btnMatch.addEventListener('click', this.handleMatchClick);
//     });
// }

//     handleChatClick(event) {
//         const friendId = event.currentTarget.dataset.friendId;
//         state.chatApp.changeChatUser(friendId);
//     }

//     handleMatchClick(event) {
//         const friendId = event.currentTarget.dataset.friendId;
//         state.mmakingApp.invite(friendId, event.currentTarget);
//     }

//     removeAllFriendListeners() {
//         document.querySelectorAll('.friend-item').forEach(friendItem => {
//             const btnChat = friendItem.querySelector('.btn-chat');
//             const btnMatch = friendItem.querySelector('.btn-match');
    
//             btnChat.removeEventListener('click', this.handleChatClick);
//             btnMatch.removeEventListener('click', this.handleMatchClick);
//         });
//     }

//     async getInfos() {
//         let data = {
//             "header": {
//                 "service": "social",
//                 "dest": "back",
//                 "id": state.client.userId
//             },
//             "body":{
//                 "status": "info"
//             }
//         };
//         await state.mainSocket.send(JSON.stringify(data));
//     }
//
//     async displayReceivedRequests() {
//         try {
//             await fetchReceivedRequests(); // Assure-toi que les données sont chargées avant de les afficher

//             if (!this.friendReceivedRequests || this.friendReceivedRequests.size === 0) {
//                 console.log('Aucune demande d\'ami reçue ou utilisateur non authentifié.');
//                 return;
//             }

//             console.log('Demandes d\'ami reçues :');
//             console.table([...this.friendReceivedRequests.values()], ['id', 'username', 'avatar']);

//         } catch (error) {
//             console.error('Erreur lors de l\'affichage des demandes d\'amis :', error);
//         }
//     }
// }