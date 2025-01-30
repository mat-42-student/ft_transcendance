import { state } from './main.js'

export class SocialApp{

    constructor(){
    }

    incomingMsg(data) {
        // console.log("social incoming msg for user : " + data.user + " status " + data.status);
        let friend = state.client.friendlist.get(data.user_id);
        friend['status'] = data.status;
        console.log(state.client.friendlist.get(data.user_id));
        this.renderFriend(data.user_id);
    }

    renderFriend(id) {
        const friendItem = document.querySelector(`.friend-detail[data-user-id="${id}"]`);
        if (friendItem) {
            const statusSpan = friendItem.querySelector('.friend-status');
            statusSpan.classList.remove('online', 'ingame', 'offline', 'pending');
            statusSpan.classList.add(state.client.friendlist.get(id).status);
        } else {
            console.warn(`Utilisateur avec user_id ${id} introuvable.`);
        }
    }
}