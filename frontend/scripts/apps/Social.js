import { state } from '../main.js';
import { navigator } from '../nav.js';
import { updatePendingCountDisplay } from '../components/friend_requests.js';
import { fetchFriends, fetchPendingCount, fetchReceivedRequests, fetchSentRequests, modifyRelationship } from '../api/users.js';
import { getAvatarPath } from '../utils.js';

export class SocialApp{

    constructor(){
        this.friendList = new Map();
        this.myStatus = null;
        this.friendReceivedRequests = new Map();
        this.friendSentRequests = new Map();
        this.pendingCount = 0;
    }

    async render() {
        await this.updateFriendMap();
        this.buildAndDisplayFriendList();
        await this.renderOthers();
    }

    async renderNoBuild() {
        await this.updateFriendMap();
        await this.renderOthers();
    }

    async renderOthers() {
        await this.renderNotif();
        await state.chatApp?.renderChat();
        await state.mmakingApp?.update_friendList();
    }

    async renderNotif() {
        this.getPendingCount();
        await this.getInfos();
    }

    async updateFriendMap() {
        const newList = await this.getFriendMap();
        // if (newList == null || newList.size == 0)
        //     return;
        for (const id of this.friendList.keys())
            if (!newList.has(id)) this.deleteFriend(id);
        for (const [id, friend] of newList.entries())
            if (!this.friendList.has(id)) this.addFriend(id, friend);
    }

    deleteFriend(id) {
        this.friendList.delete(id);
        const htmlFriendList = document.querySelector('.friends-list');
        if (!htmlFriendList)
            return;
        const friendItem = htmlFriendList.querySelector(`.friend-item-${id}`);
        if (friendItem)
            friendItem.remove();
    }

    addFriend(id, friend) {
        this.friendList.set(id, friend);
        const htmlFriendList = document.querySelector('.friends-list');
        if (!htmlFriendList)
            return;
        this.addFriendEntry(friend, htmlFriendList);
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

    incomingMsg(data) {
        if (data.user_id == state.client.userId) {
            this.myStatus = data.status;
            state.client.renderProfileBtn();
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

    buildAndDisplayFriendList() {
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
            // htmlFriendList.innerHTML = '<p>I\'m sorry you have no friends</p>';
            return;
        }
        this.friendList.forEach((friend) => this.addFriendEntry(friend, htmlFriendList));
    }

    addFriendEntry(friend, parent) {
        const avatarPath = getAvatarPath(friend.avatar);
        const friendItem = document.createElement('li');
        friendItem.classList.add('friend-item');
        friendItem.innerHTML = `
            <img class="friend-avatar" src="${avatarPath}" alt="${friend.username}">
            <div class="friend-info">
                <span class="friend-name">${friend.username}</span>
                <div class="friend-detail" data-user-id="${friend.id}">
                    <span class="friend-status ${friend.status}"></span>
                    <button class="btn-match"><img id=btn-match-picture-${friend.id} src="/ressources/vs.png"></button>
                    <button class="btn-chat"><img src="${state.chatApp.fixChatIcon(friend.id)}"></button>
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
        let data = {
            "header": {
                "service": "social",
                "dest": "back",
            },
            "body": {
                "status": "notify",
                "id": userId,
                "from": state.client.userId,
            }
        };
        await state.mainSocket.send(JSON.stringify(data));
    }

    async notifyAllFriends() {
        const promises = [];
        for (const friendId of this.friendList.keys()) {
            promises.push(this.notifyUser(friendId));
        }
        await Promise.all(promises);
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
        await state.mainSocket.send(JSON.stringify(data));
    }

    async getFriendMap() {
        const friends = await fetchFriends(state.client.userId);
        return new Map(friends.map(friend => [friend.id, friend]));
        // this.displayFriendList();
    }

    async getReceivedRequests() {
        const receivedRequests = await fetchReceivedRequests();
        this.friendReceivedRequests = new Map(receivedRequests.map(friend => [friend.id, friend]));
    }

    async getSentRequests() {
        const sentRequests = await fetchSentRequests();
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
}