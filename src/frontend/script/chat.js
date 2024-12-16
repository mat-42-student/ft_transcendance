const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatUser = document.getElementById('chat-user');
const chatBody = document.getElementById('chat-body');
const myId = document.getElementById('user_id');

chatForm.addEventListener('submit', function(event) {
    event.preventDefault();
    let message = chatInput.value.trim();
    let dest = chatUser.value;
    if (message !== '') {
        autopost_message(message);
        send_msg(dest, message); // Appelle la fonction avec le message
        chatInput.value = ''; // Vide le champ après envoi
    }
});

function chat_incoming_msg(data) {
    console.log("here chat.js");
    console.log(JSON.stringify(data));
    dest = data['header']['id'];

    // here a map to store messages with keys = usernames or userid
    map_message(data);
    if (myId.value == dest)
        post_friend_message(data);
    else
        store_friend_message(data);
}

function map_message(data){
    // store message in map
}

function post_friend_message(data){
    myDiv = document.createElement('div');
    myDiv.className = "chat-message friend-message";
    myDiv.textContent = data['body']['message'];
    chatBody.appendChild(myDiv);
}


function autopost_message(msg) {
    myDiv = document.createElement('div');
    myDiv.className = "chat-message user-message";
    myDiv.textContent = msg;
    chatBody.appendChild(myDiv);
}

function store_friend_message(data) {
    // nothinh since it's already stored in map_message ?
    // display numer of unread messages
}

// Fonction sendMsg (exemple de base)
async function send_msg(dest, message) {
    console.log("Message envoyé :", message);
    data = {
        'header': {
            'service': 'chat',
        },
        'body': {
            'to':dest,
            'message': message,
        }
    };
    await mainSocket.send(JSON.stringify(data));
}