import { state } from './main.js';

export class ChatApp{

    constructor(){
        this.doDOMThings();
        this.storedMessages = new Map(); // map to store messages with keys = userid and value = array of messages
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
        let message = this.chatInput.value.trim() || '';
        if (this.activeChatUserId && message !== '') {
            this.storeMyMessage(message);
            this.postMyMessage(message);
            this.sendMsg(this.activeChatUserId, message);
            this.chatInput.value = '';
        }
    }

    incomingMsg(data) {
        const friend = data.body.from;
        if (!this.storedMessages.has(friend))
            this.storedMessages.set(friend, []);
        this.storeIncomingMessage(data);
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

    storeIncomingMessage(data){
        let user = Number(data.body.from);
        let newMessage = {
            message: data.body.message,
            timestamp: data.body.timestamp,
            from: 'friend'
        };
        if (!this.storedMessages.has(user))
            this.storedMessages.set(user, []);
        this.storedMessages.get(user).push(newMessage);
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
        friendId = Number(friendId);
        if(friendId === this.activeChatUserId)
            return;
        if (!this.storedMessages.has(friendId))
            this.storedMessages.set(friendId, []);
        this.activeChatUserId = Number(friendId);
        this.renderChat();
    }

    loadHistory() {
        let messages = this.storedMessages.get(this.activeChatUserId);
        if (!messages)
            return;
        messages.forEach(element => {
            console.log("loading " + element.message);
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
        this.chatUser.innerText = friend.username + '(' + this.activeChatUserId + ')';
        this.noUnreadMessage();
        this.loadHistory();
    }

    hasUnreadMessage(friend) {
    // Make chat btn with friend to be green or something
        const chatImg = document.querySelector('.friend-detail[data-user-id="' + friend + '"] .btn-chat img');
        chatImg.src = "/ressources/chat_new_msg.png";
    }

    noUnreadMessage() {
    // Make chat btn with friend to be normal
        const chatImg = document.querySelector('.friend-detail[data-user-id="' + this.activeChatUserId + '"] .btn-chat img');
        chatImg.src = "/ressources/chat.png";
    }

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
        await state.mainSocket.send(JSON.stringify(data));
    }
}