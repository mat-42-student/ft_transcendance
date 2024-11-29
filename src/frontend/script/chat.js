// let chatInput, destCont;

function initChat() {
    // chatInput = document.getElementById("chatMsg");

    // if (!chatInput) {
    //     console.error("Element with id 'chatMsg' not found.");
    //     return;
    // }

    // chatInput.addEventListener("keyup", function(event) {
    //     if (event.key === "Enter") {
    //         onEnterPress();
    //     }
    // });
}

async function onEnterPress() {
    let chatInput = document.getElementById("chatMsg");
    if (!chatInput || !mainSocket || mainSocket.readyState !== WebSocket.OPEN) {
        console.error("WebSocket is not ready or chatInput is missing.");
        return;
    }

    const inputValue = chatInput.value.trim();
    if (inputValue === "") {
        console.log("Message is empty, nothing to send.");
        return;
    }

    let destCont = document.getElementById("cont").value;
    try {
        await mainSocket.send(JSON.stringify({
            'dc': destCont,
            'message': inputValue,
            'url': '',
            'method':'POST',
        }));
        chatInput.value = '';
    } catch (error) {
        console.error("Failed to send message:", error);
    }
}
