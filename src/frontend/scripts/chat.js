export class ChatApp{

    constructor(mainSocket){
        this.doDOMThings();
        this.mainSocket = mainSocket;
        this.storedMessages = new Map(); // map to store messages with keys = userid and value = array of messages
        // this.unreadMessages = new Map(); // map to count/display unread messages. OBSOLETE
        this.activeChatUserId = 0; // Change value by calling loadHistory 
    }

    doDOMThings() {
        this.chatForm = document.getElementById('chat-form');
        this.chatInput = document.getElementById('chat-input');
        this.chatUser = document.getElementById('chat-user');
        this.chatBody = document.getElementById('chat-body');
        this.myId = sessionStorage.getItem("userId");
        this.chatForm.addEventListener('submit', this.chatFormListener.bind(this));
    }

    chatFormListener(event) {
    // Triggered when I send a message to my friend
        event.preventDefault(); // don't send the form
        let message = this.chatInput.value.trim();
        let dest = this.chatUser.dataset.userId;
        if (dest && message !== '') {
            this.storeMyMessage(message);
            this.postMyMessage(message);
            this.sendMsg(dest, message);
            this.chatInput.value = '';
        }
        else
            console.error("dest: " + dest + "\nmsg: " + message);
    }

    incomingMsg(data) {
    // Triggered when I receive a message from my friend
        console.log("Incoming msg from " + data.body.from + "\nData is :" + JSON.stringify(data));
        this.activeChatUserId = document.getElementById("chat-user").dataset.userId;
        console.log("Active chat user is : " + this.activeChatUserId + "\n");
        this.storeMessage(data);
        // if (this.myId == data.header.id) // faux ?! il faut check ['body']['from']
        if (this.chatUser == data.body.from)
            this.postFriendMessage(data);
        else
            this.hasUnreadMessage(data.body.from);
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
        // console.log("stored in map["+ this.activeChatUserId + "]:" + JSON.stringify(data.body));
    }

    storeMessage(data){
        let user = data.body.from;
        data.body.from = 'friend';
        if (!this.storedMessages.has(user))
            this.storedMessages.set(user, []);        
        this.storedMessages.get(user).push(data.body);
        // console.log("stored in map["+ user + "]:" + JSON.stringify(data.body));
    }

    postFriendMessage(data){
        let myDiv = document.createElement('div');
        myDiv.className = "chat-message friend-message";
        myDiv.textContent = data.body.message;
        this.chatBody.appendChild(myDiv);
    }

    postMyMessage(msg) {
        let myDiv = document.createElement('div');
        myDiv.className = "chat-message user-message";
        myDiv.textContent = msg;
        this.chatBody.appendChild(myDiv);
    }

    loadHistory(friend) {
        this.activeChatUserId = friend;
        this.storedMessages.get(friend).array.forEach(element => {
            if (element.from == "myself")
                this.postMyMessage(element.message);
            else
                this.postFriendMessage(element.message);
        });
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
        const strBtn = '.friend-detail[data-user-id="' + friend + '"] .btn-chat';
        console.log(strBtn);
        const chatButton = document.querySelector('.friend-detail[data-user-id="' + friend + '"] .btn-chat');
        chatButton.style.backgroundColor = 'red';
        chatButton.style.color = 'white';
    }

    getUnreadMessage(id) {
        if (this.unreadMessages.has(id))
            return this.unreadMessages.get(id);
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
        console.log("Chat sending : " + data);
        await this.mainSocket.send(JSON.stringify(data));
    }
}