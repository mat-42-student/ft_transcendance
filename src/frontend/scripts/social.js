export class SocialApp{

    constructor(mainSocket){
        this.mainSocket = mainSocket;
        // this.myId = document.getElementById('user_id');
    }

    incomingMsg(data) {
        // console.log("social incoming msg for user : " + data.user + " status " + data.status);
        const friendItem = document.querySelector(`.friend-detail[data-user-id="${data.user}"]`);
        if (friendItem) {
            const statusSpan = friendItem.querySelector('.friend-status');
            statusSpan.classList.remove('online', 'ingame', 'offline', 'pending');
            statusSpan.classList.add(data.status);
        } else {
            console.warn(`Utilisateur avec user_id ${data.user} introuvable.`);
        }
    }
}