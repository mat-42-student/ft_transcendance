import { state } from './main.js'

export class SocialApp{

    constructor(){
    }

    incomingMsg(data) {
        // console.log("social incoming msg for user : " + data.user + ", status " + data.status);
        let friend = state.client.friendlist.get(data.user_id);
        friend['status'] = data.status;
        this.renderFriendStatus(data.user_id);
    }

    renderFriendStatus(id) {
        const friendItem = document.querySelector(`.friend-detail[data-user-id="${id}"]`);
        if (friendItem) {
            const status = state.client.friendlist.get(id).status
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
        friendsList.innerHTML = ''; // Efface la liste existante
        if (state.client.friendlist == null) {
            friendsList.innerHTML = '<p>Aucun ami trouvé.</p>';
            return;
        }
        state.client.friendlist.forEach((friend) => {
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
            friendItem.querySelector('.btn-chat').addEventListener('click', () => {
                state.chatApp.changeChatUser(friend.id);
            });
            friendItem.querySelector('.btn-match').addEventListener('click', () => {
                state.mmakingApp.invite(friend.id);
            });
        });
    }

}