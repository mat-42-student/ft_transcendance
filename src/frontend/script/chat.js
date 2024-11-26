let chatInput;

function initChat() {
    chatInput = document.getElementById("chatMsg");

    if (!chatInput) {
        console.error("Element with id 'chatMsg' not found.");
        return;
    }

    chatInput.addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
            onEnterPress();
        }
    });
}

async function onEnterPress() {
    if (!chatInput || !mainSocket || mainSocket.readyState !== WebSocket.OPEN) {
        console.error("WebSocket is not ready or chatInput is missing.");
        return;
    }

    const inputValue = chatInput.value.trim(); // Remove extra whitespace
    if (inputValue === "") {
        console.log("Message is empty, nothing to send.");
        return;
    }

    console.log("Sending message:", inputValue);
    try {
        await mainSocket.send(JSON.stringify({
            'dc': 'chat',
            'message': inputValue,
        }));
        chatInput.value = ''; // Clear input after successful send
    } catch (error) {
        console.error("Failed to send message:", error);
    }
}
