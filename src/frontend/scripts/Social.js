import { state } from './main.js'

export class SocialApp{

    constructor(){
        this.friendlist = null;
        this.myStatus = null;
    }

    async fetchFriends() {
        const token = state.client.accessToken;
        if (!token) {
            console.error("User is not connected");
            return;
        }
        try {
            const response = await fetch('api/v1/users/relationships/my-relationships/', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                const friendsData = data.friends || [];
                if (!Array.isArray(friendsData)) {
                    console.error("Data is not an array :", friendsData);
                    return;
                }
                if (!state.client.userId) {
                    console.error("User unknown");
                    return;
                }
                const friends = friendsData.map(rel => {
                    // Vérifie si l'utilisateur connecté est `from_user` ou `to_user`
                    return rel.from_user.id === state.client.userId ? rel.to_user : rel.from_user;
                });
                this.friendlist = new Map(friends.map(user => [user.id, user]));
                this.displayFriendsList();
            } else {
                console.error("Error while loading friendlist :", response.status);
            }
        } catch (error) {
            console.error("Fetch error: ", error);
        }
    }

    getFriend(id) {
        id = Number(id);
        return Number.isInteger(id) ? this.friendlist.get(id) : null;
    }

    close() {
        this.removeAllFriendListeners();
        document.querySelector('.friends-list').innerHTML = '<p>Sign in to interact with friends</p>';
        this.friendlist = null;
    }

    incomingMsg(data) {
        if (data.user_id == state.client.userId) {
            this.myStatus = data.status;
            return ;
        }
        let friend = this.friendlist.get(data.user_id);
        if (!friend)
            return ;
        friend['status'] = data.status;
        this.renderFriendStatus(data.user_id);
    }

    renderFriendStatus(id) {
        const friendItem = document.querySelector(`.friend-detail[data-user-id="${id}"]`);
        if (friendItem) {
            const status = this.friendlist.get(id).status
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

    displayFriendsList() {
        const friendsList = document.querySelector('.friends-list');
        friendsList.querySelectorAll('.friend-item').forEach(friendItem => {
            const btnChat = friendItem.querySelector('.btn-chat');
            const btnMatch = friendItem.querySelector('.btn-match');
            btnChat.removeEventListener('click', this.handleChatClick);
            btnMatch.removeEventListener('click', this.handleMatchClick);
        });
        friendsList.innerHTML = '';
        if (this.friendlist == null) {
            friendsList.innerHTML = '<p>Seems you have no friends</p>';
            return;
        }
        this.friendlist.forEach((friend) => {
            const friendItem = document.createElement('li');
            friendItem.classList.add('friend-item');
            friendItem.innerHTML = `
                <img class="friend-avatar" src="/media/avatars/${friend.avatar}" alt="${friend.username}">
                <div class="friend-info">
                    <span class="friend-name">${friend.username}</span>
                    <div class="friend-detail" data-user-id="${friend.id}">
                        <span class="friend-status ${friend.status}"></span>
                        <button class="btn-match"><img src="/ressources/vs.png"></button>
                        <button class="btn-chat"><img src="/ressources/chat.png"></button>
                    </div>
                </div>
            `;
            friendsList.appendChild(friendItem);

            // add data-user-id="${friend.id} to entire card (create by adrien)
            friendItem.dataset.userid = friend.id;
    
            const btnChat = friendItem.querySelector('.btn-chat');
            const btnMatch = friendItem.querySelector('.btn-match');
    
            btnChat.dataset.friendId = friend.id;
            btnMatch.dataset.friendId = friend.id;
            btnMatch.dataset.invite = 0;
    
            btnChat.addEventListener('click', this.handleChatClick);
            btnMatch.addEventListener('click', this.handleMatchClick);
        });
    }

    handleChatClick(event) {
        const friendId = event.currentTarget.dataset.friendId;
        state.chatApp.changeChatUser(friendId);
    }
    
    handleMatchClick(event) {
        const friendId = event.currentTarget.dataset.friendId;
        state.mmakingApp.invite(friendId, event.currentTarget);
    }

    removeAllFriendListeners() {
        document.querySelectorAll('.friend-item').forEach(friendItem => {
            const btnChat = friendItem.querySelector('.btn-chat');
            const btnMatch = friendItem.querySelector('.btn-match');
    
            btnChat.removeEventListener('click', this.handleChatClick);
            btnMatch.removeEventListener('click', this.handleMatchClick);
        });
    }

    async getInfos() {
        let data = {
            "header": {
                "service": "social",
                "dest": "back",
                "id": state.client.userId
            },
            "body":{
                "status": "info"
            }
        };
        await state.mainSocket.send(JSON.stringify(data));
    }
}