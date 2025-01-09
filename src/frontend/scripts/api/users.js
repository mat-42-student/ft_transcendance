export async function fetchFriends() {
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
        console.error("Impossible de récupérer les amis : utilisateur non authentifié.");
        return;
    }

    try {
        const response = await fetch('api/v1/users/relationships/my-relationships', {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Données retournées par l'API :", data);

            // Vérifie que la clé "friends" est présente et est un tableau
            const friendsData = data.friends || [];
            if (!Array.isArray(friendsData)) {
                console.error("Le champ 'friends' n'est pas un tableau :", friendsData);
                return;
            }

            const userId = parseInt(sessionStorage.getItem('userId'), 10);
            if (!userId) {
                console.error("Impossible de déterminer l'utilisateur connecté.");
                return;
            }

            // Filtrer et mapper les amis
            const friends = friendsData.map(rel => {
                // Vérifie si l'utilisateur connecté est `from_user` ou `to_user`
                return rel.from_user.id === userId ? rel.to_user : rel.from_user;
            });

            console.log("Liste des amis :", friends); //debug

            // Stocker les amis dans sessionStorage
            sessionStorage.setItem('friends', JSON.stringify(friends));
            console.log("Amis stockés dans sessionStorage."); //debug

            // Fonction d'affichage
            displayFriendsList();
        } else {
            console.error("Erreur lors de la récupération des amis :", response.status);
        }
    } catch (error) {
        console.error("Erreur réseau :", error);
    }
}

// Penser à ajouter écouteur sur profiles quand seront op
function addChatButtonListeners() {
    // Sélectionne tous les boutons "btn-chat" dynamiquement
    const chatButtons = document.querySelectorAll('.btn-chat');

    // Ajoute un gestionnaire d'événements à chaque bouton
    chatButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
            const friendItem = event.target.closest('.friend-item'); // Trouve l'élément parent 'friend-item'
            if (!friendItem) {
                console.error("Élément 'friend-item' introuvable.");
                return;
            }

            // Récupère le nom d'utilisateur (username) du 'friend-item'
            const username = friendItem.querySelector('.friend-name').textContent;
            if (!username) {
                console.error("Nom d'utilisateur introuvable dans 'friend-item'.");
                return;
            }
            
            // Récupère les amis depuis sessionStorage
            const friends = JSON.parse(sessionStorage.getItem('friends') || '[]');

            // Trouve les infos du User concerné
            const friendData = friends.find((friend) => friend.username === username);
            if (!friendData) {
                console.error("Impossible de trouver les informations pour cet utilisateur :", username);
                return;
            }

            // Crée une Map contenant les informations du User
            const friendInfoMap = new Map(Object.entries(friendData));

            // Affiche les informations dans le terminal
            console.log("Informations du User :", Array.from(friendInfoMap.entries()));

            // Utilise friendInfoMap pour mettre à jour le nom dans l'interface de chat
            const chatFriendName = document.querySelector('.chat-header .friend-name');
            if (chatFriendName) {
                const usernameFromMap = friendInfoMap.get('username'); // Récupère le username depuis la Map
                chatFriendName.textContent = usernameFromMap;
                console.log(`Nom d'utilisateur mis à jour avec friendInfoMap : ${usernameFromMap}`);
            } else {
                console.error("Erreur : élément '.friend-name' introuvable.");
            }
        });
    });
}

function displayFriendsList() {
    const friendsList = document.querySelector('.friends-list');
    friendsList.innerHTML = ''; // Efface la liste existante

    // Récupère les amis depuis sessionStorage
    const friends = JSON.parse(sessionStorage.getItem('friends') || '[]');

    if (friends.length === 0) {
        friendsList.innerHTML = '<p>Aucun ami trouvé.</p>';
        return;
    }

    // Génère la liste des amis
    friends.forEach((friend) => {
        const friendItem = document.createElement('li');
        friendItem.classList.add('friend-item');
        friendItem.innerHTML = `
            <img class="friend-avatar" src="/media/avatars/${friend.avatar}" alt="${friend.username}">
            <div class="friend-info">
                <span class="friend-name">${friend.username}</span>
                <div class="friend-detail">
                    <span class="friend-status ${friend.status}"></span>
                    <button class="btn-match"><img src="/ressources/vs.png"></button>
                    <button class="btn-chat"><img src="/ressources/chat.png"></button>
                </div>
            </div>
        `;
        friendsList.appendChild(friendItem);
    });

    // Ajoute les écouteurs aux boutons 'btn-chat'
    addChatButtonListeners();
}