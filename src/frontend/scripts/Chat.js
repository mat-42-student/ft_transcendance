import { state } from './main.js';

export class ChatApp{

    constructor(){
        this.doDOMThings();
        this.storedMessages = new Map(); // map to store messages with keys = userid and value = array of messages
        // this.unreadMessages = new Map(); // map to count/display unread messages. OBSOLETE
        this.activeChatUserId = null; // Change value by calling loadHistory 
    }

    doDOMThings() {
        this.chatForm = document.getElementById('chat-form');
        this.chatInput = document.getElementById('chat-input');
        this.chatUser = document.getElementById('chat-user');
        this.chatBody = document.getElementById('chat-body');
        this.chatForm.addEventListener('submit', this.chatFormListener.bind(this));
    }

    chatFormListener(event) {
    // Triggered when I send a message to my friend
        event.preventDefault(); // don't send the form
        let message = this.chatInput.value.trim() || '';
        if (this.activeChatUserId && message !== '') {
            this.storeMyMessage(message);
            this.postMyMessage(message);
            this.sendMsg(this.activeChatUserId, message);
            this.chatInput.value = '';
        }
    }

    incomingMsg(data) {
    // Triggered when I receive a message from my friend
        const friend = data.body.from;
        this.storeMessage(data);
        if (this.activeChatUserId == friend)
            this.postFriendMessage(data.body.message);
        else
            this.hasUnreadMessage(friend);
    }

    storeMyMessage(msg){
        const now = new Date();
        let data = {
            "body": {
                "message": msg,
                "timestamp": now.toISOString(),
                "from": 'myself'
            }
        };
        if (!this.storedMessages.has(this.activeChatUserId))
            this.storedMessages.set(this.activeChatUserId, []);
        this.storedMessages.get(this.activeChatUserId).push(data.body);
    }

    storeMessage(data){
        let user = data.body.from;
        data.body.from = 'friend';
        if (!this.storedMessages.has(user))
            this.storedMessages.set(user, []);        
        this.storedMessages.get(user).push(data.body);
    }

    postFriendMessage(data){
        let myDiv = document.createElement('div');
        myDiv.className = "chat-message friend-message";
        myDiv.textContent = data;
        this.chatBody.appendChild(myDiv);
    }

    postMyMessage(msg) {
        let myDiv = document.createElement('div');
        myDiv.className = "chat-message user-message";
        myDiv.textContent = msg;
        this.chatBody.appendChild(myDiv);
    }

    changeChatUser(friendId){
        if(friendId === this.activeChatUserId)
            return;
        this.activeChatUserId = friendId;
        this.renderChat();
    }

    loadHistory() {
        let messages = this.storedMessages.get(Number(this.activeChatUserId));
        if (!messages)
            return;
        messages.forEach(element => {
            if (element.from == "myself")
                this.postMyMessage(element.message);
            else
                this.postFriendMessage(element.message);
        });
    }

    close() {
        this.chatInput = null;
        this.chatUser = null;
        this.chatForm.removeEventListener('submit', this.chatFormListener.bind(this));
        this.chatForm = null;
        this.activeChatUserId = null;
        this.storedMessages = null;
        this.chatBody.replaceChildren();
        this.chatBody = null;
    }

    renderChat() {
        this.chatBody.replaceChildren();
        const friend = state.socialApp.getFriend(this.activeChatUserId);
        if (!friend)
            return;
        this.chatUser.innerText = friend.username;
        this.noUnreadMessage();
        this.loadHistory();
    }

    // addUnreadMessage(id) {
    // increment number of unread messages
    //     if (this.unreadMessages.has(id))
    //         this.unreadMessages.set(id, this.unreadMessages.get(id) + 1);
    //     else
    //         this.unreadMessages.set(id, 1);
    // }

    hasUnreadMessage(friend) {
    // Make chat btn with friend to blink or be red or something
        const chatImg = document.querySelector('.friend-detail[data-user-id="' + friend + '"] .btn-chat img');
        chatImg.src = "/ressources/chat_new_msg.png";
    }

    noUnreadMessage() {
    // Make chat btn with friend to blink or be red or something
        const chatImg = document.querySelector('.friend-detail[data-user-id="' + this.activeChatUserId + '"] .btn-chat img');
        chatImg.src = "/ressources/chat.png";
    }

    // getUnreadMessage(id) {
    //     if (this.unreadMessages.has(id))
    //         return this.unreadMessages.get(id);
    // }

    async sendMsg(dest, message) {
        let data = {
            'header': {
                'service': 'chat',
            },
            'body': {
                'to':dest,
                'message': message,
            }
        };
        // console.log("Chat sending : " + data);
        await state.mainSocket.send(JSON.stringify(data));
    }
}