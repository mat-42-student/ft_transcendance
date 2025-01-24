import { state } from './main.js'

export class SocialApp{

    constructor(){
    }

    incomingMsg(data) {
        // console.log("social incoming msg for user : " + data.user + " status " + data.status);
        let friend = state.client.friendlist.get(data.user_id);
        friend['status'] = data.status;
        this.renderFriend(data.user_id);
    }

    renderFriend(id) {
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
}