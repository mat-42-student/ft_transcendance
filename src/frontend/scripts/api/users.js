import { state } from '../main.js';

export async function fetchFriends() {
    const token = state.client.accessToken;
    if (!token) {
        console.error("Impossible de récupérer les amis : utilisateur non authentifié.");
        return;
    }
    try {
        const response = await fetch('api/v1/users/relationships/my-relationships/', {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (response.ok) {
            const data = await response.json();
            const friendsData = data.friends || [];
            if (!Array.isArray(friendsData)) {
                console.error("Le champ 'friends' n'est pas un tableau :", friendsData);
                return;
            }
            if (!state.client.userId) {
                console.error("Impossible de déterminer l'utilisateur connecté.");
                return;
            }
            const friends = friendsData.map(rel => {
                // Vérifie si l'utilisateur connecté est `from_user` ou `to_user`
                return rel.from_user.id === state.client.userId ? rel.to_user : rel.from_user;
            });
            state.client.friendlist = new Map(friends.map(user => [user.id, user]));
            state.socialApp.displayFriendsList();
        } else {
            console.error("Erreur lors de la récupération des amis :", response.status);
        }
    } catch (error) {
        console.error("Erreur réseau :", error);
    }
}

// Penser à ajouter écouteur sur profiles quand seront op
// function addChatButtonListeners() {
//     // Sélectionne tous les boutons "btn-chat" dynamiquement
//     const chatButtons = document.querySelectorAll('.btn-chat');

//     // Ajoute un gestionnaire d'événements à chaque bouton
//     chatButtons.forEach((button) => {
//         button.addEventListener('click', (event) => {
//             const friendItem = event.target.closest('.friend-item'); // Trouve l'élément parent 'friend-item'
//             if (!friendItem) {
//                 console.error("Élément 'friend-item' introuvable.");
//                 return;
//             }

//             // Récupère le nom d'utilisateur (username) du 'friend-item'
//             const username = friendItem.querySelector('.friend-name').textContent;
//             if (!username) {
//                 console.error("Nom d'utilisateur introuvable dans 'friend-item'.");
//                 return;
//             }

//             // Utilise friendInfoMap pour mettre à jour le nom dans l'interface de chat
//             const chatFriendName = document.querySelector('.chat-header .friend-name');
//             if (chatFriendName) {
//                 const usernameFromMap = friendInfoMap.get('username'); // Récupère le username depuis la Map
//                 const userIdFromMap = friendInfoMap.get('id');
//                 chatFriendName.textContent = usernameFromMap;
//                 chatFriendName.setAttribute('data-user-id', userIdFromMap);
//                 // console.log(`Nom d'utilisateur mis à jour avec friendInfoMap : ${usernameFromMap}`);
//             } else {
//                 console.error("Erreur : élément '.friend-name' introuvable.");
//             }
//         });
//     });
// }