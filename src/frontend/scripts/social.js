export class SocialApp{

    constructor(mainSocket){
        this.mainSocket = mainSocket;
        this.myId = document.getElementById('user_id');
    }

    chatIncomingMsg(data) {
        console.log("here social.js");
        console.log(JSON.stringify(data));
    }
}