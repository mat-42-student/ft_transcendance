import { state } from '../main.js';
import { apiRequest } from '../api/users.js';
import { mainErrorMessage } from '../utils.js';

export class ChatApp{

    constructor(){
        this.doDOMThings();
        this.storedMessages = new Map(); // map to store messages with keys = userid and value = array of messages
        this.unreadMessages = new Set(); // set to store unread messages with keys = userid and value = boolean
        this.activeChatUserId = null; // Change value by calling loadHistory 
    }

    doDOMThings() {
        this.chatForm = document.getElementById('chat-form');
        this.chatInput = document.getElementById('chat-input');
        this.chatUser = document.getElementById('chat-user');
        this.chatBody = document.getElementById('chat-body');
        this.chatMute = document.getElementById('chat-mute');
        this.chatForm.addEventListener('submit', this.chatFormListener.bind(this));
        this.chatMute.addEventListener('click', this.chatMuteListener.bind(this));
    }

    async isChatUserMuted() {
        try {
            const response = await apiRequest(`/api/v1/users/${this.activeChatUserId}/muted/`);
            if (response == null || typeof response.is_blocked !== 'boolean')
                return false;
            return response.is_blocked;
        }
        catch (error) {
            return mainErrorMessage(error);
        }
    }    

    async chatMuteListener(event) {
        try {
            if (this.activeChatUserId == null)
                return;
            const muted = await this.isChatUserMuted();
            if (!muted)
                await apiRequest(`/api/v1/users/${this.activeChatUserId}/block/`, "POST");
            else
                await apiRequest(`/api/v1/users/${this.activeChatUserId}/unblock/`, "DELETE");
            await this.renderMute();
        } catch (error) {
            return mainErrorMessage(error);
        }
    }

    async renderMute() {
        if (this.activeChatUserId == null)
            return;
        const muted = await this.isChatUserMuted();
        if (muted)
            this.chatMute.checked = true;
        else
            this.chatMute.checked = false;
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
        if (friend == state.userId)
            return this.postError(data);
        if (!this.storedMessages.has(friend))
            this.storedMessages.set(friend, []);
        this.storeIncomingMessage(data);
        if (this.activeChatUserId == friend)
            this.postFriendMessage(data.body.message);
        else
            this.setUnreadMessage(friend);
    }

    toggleChatInput(status) {
        if (status == 'offline')
            this.chatInput.disabled = true;
        else
            this.chatInput.disabled = false;
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

    postError(data) {
        let myDiv = document.createElement('div');
        myDiv.className = "chat-message error-message";
        myDiv.textContent = "Error: " + data.body.message;
        this.chatBody.appendChild(myDiv);
        this.scrollToBottom();
    }

    postFriendMessage(data){
        let myDiv = document.createElement('div');
        myDiv.className = "chat-message friend-message";
        myDiv.textContent = data;
        this.chatBody.appendChild(myDiv);
        this.scrollToBottom();
    }

    postMyMessage(msg) {
        let myDiv = document.createElement('div');
        myDiv.className = "chat-message user-message";
        myDiv.textContent = msg;
        this.chatBody.appendChild(myDiv);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.chatBody.scrollTop = this.chatBody.scrollHeight;
    }
    
    async changeChatUser(friendId){
        friendId = Number(friendId);
        if(friendId === this.activeChatUserId)
            return;
        if (!this.storedMessages.has(friendId))
            this.storedMessages.set(friendId, []);
        this.activeChatUserId = Number(friendId);
        await this.renderChat();
    }

    loadHistory() {
        let messages = this.storedMessages.get(this.activeChatUserId);
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
        this.chatInput.disabled = true;
        this.chatUser.innerText = "Chat"
        this.chatInput = null;
        this.chatUser = null;
        this.chatForm.removeEventListener('submit', this.chatFormListener.bind(this));
        this.chatForm = null;
        this.activeChatUserId = null;
        this.storedMessages = null;
        this.chatBody.replaceChildren();
        this.chatBody = null;
    }

    async renderChat() {
        this.chatBody.replaceChildren();
        const friend = state.socialApp.getFriend(this.activeChatUserId);
        if (!friend)
            return;
        this.chatUser.innerText = friend.username;
        this.noUnreadMessage();
        this.loadHistory();
        this.chatInput.disabled = false;
        await this.renderMute();
    }

    setUnreadMessage(friend) {
    // Make chat btn with friend to be green or something adn add user to unreadMessages Set
        this.unreadMessages.add(friend);
        const chatImg = document.querySelector('.friend-detail[data-user-id="' + friend + '"] .btn-chat img');
        chatImg.src = "/ressources/chat_new_msg.png";
    }

    noUnreadMessage() {
    // Make chat btn with friend to be normal and remove user from unreadMessages Set
        this.unreadMessages.delete(this.activeChatUserId);
        const chatImg = document.querySelector('.friend-detail[data-user-id="' + this.activeChatUserId + '"] .btn-chat img');
        chatImg.src = "/ressources/chat.png";
    }

    fixChatIcon(friend_id) {
        if (this.unreadMessages.has(friend_id))
            return "/ressources/chat_new_msg.png";
        else
            return "/ressources/chat.png";
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