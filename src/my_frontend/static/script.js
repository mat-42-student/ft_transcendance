document.addEventListener("DOMContentLoaded", () => {
    const homePage = document.getElementById('home-page');
    const authModal = document.getElementById('auth-modal');
    const userProfile = document.getElementById('user-profile');
    const userList = document.getElementById('user-list');
    const friendList = document.getElementById('friend-list');
    const authTitle = document.getElementById('auth-title');
    const loginForm = document.getElementById('login-form');
    const logoutButton = document.getElementById('logout-btn');
    const registrationForm = document.getElementById('registration-form');
    const authContainer = document.getElementById('auth-container');
    const toggleAuthLink = document.getElementById('toggle-auth');
    const closeAuthButton = document.getElementById('close-auth');

    // if (response.status === 401) {
    //     sessionStorage.removeItem('token');
    //     alert("Session expirée. Veuillez vous reconnecter.");
    //     updateUI();
    // }

    // Vérifie si l'utilisateur est connecté
    function isAuthenticated() {
        return sessionStorage.getItem('token') !== null;
    }

    // Affiche le bouton de déconnexion si l'utilisateur est connecté
    function updateUI() {
        if (isAuthenticated()) {
            loginForm.style.display = 'none';
            logoutButton.style.display = 'block';
        } else {
            loginForm.style.display = 'block';
            logoutButton.style.display = 'none';
        }
    }

    // Affiche la liste des utilisateurs
    async function fetchUsers() {
        try {
            const response = await fetch('/users_api/users/', {
                // headers: {
                //     'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                // }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    sessionStorage.removeItem('token');
                    alert("Session expirée. Veuillez vous reconnecter.");
                    updateUI();
                } else {
                    alert("Erreur lors du chargement des utilisateurs.");
                }
                return;
            }
            const data = await response.json();
            const users = Array.isArray(data) ? data : data.results || [];
            userList.innerHTML = '';
            users.forEach(user => {
                const userItem = document.createElement('li');
                userItem.innerHTML = `
                    <img src="/media/avatars/${user.avatar}" alt="Avatar" width="20" height="20">
                    <span class="username" data-id="${user.id}">${user.username}</span>
                    <span>(${user.status})</span>
                `;
                userList.appendChild(userItem);
    
                userItem.querySelector('.username').addEventListener('click', () => {
                    showUserDetails(user.id); // Appeler la fonction pour afficher les détails de l'utilisateur
                });
            });
        } catch (error) {
            console.error("Erreur lors du chargement des utilisateurs:", error);
        }
    }

    // Affiche les détails d'un utilisateur
    async function showUserDetails(userId) {
        try {
            const token = sessionStorage.getItem('token');
            const headers = token ? {
                'Authorization': `Bearer ${token}`
            } : {};  // Pas d'en-tête Authorization si pas de token
            
            const response = await fetch(`/users_api/users/${userId}/`, { headers });
    
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
    
            const user = await response.json();
            console.log(user);  // Pour vérifier les données reçues
    
            const profileUsername = document.getElementById('profile-username');
            const profileAvatar = document.getElementById('profile-avatar');
            const profileStatus = document.getElementById('profile-status');
            const friendList = document.getElementById('friend-list');
    
            if (profileUsername && profileAvatar && profileStatus) {
                profileUsername.textContent = user.username;
                profileAvatar.src = `/media/avatars/${user.avatar}`;
                profileStatus.textContent = user.status;
    
                friendList.innerHTML = '';  // Réinitialiser la liste d'amis
                user.friends.forEach(friend => {
                    const friendItem = document.createElement('li');
                    friendItem.textContent = friend.username;
                    friendList.appendChild(friendItem);
                });
    
                document.getElementById('user-profile').style.display = 'block';
                document.getElementById('home-page').style.display = 'none';
            }
        } catch (error) {
            console.error("Erreur lors du chargement des détails de l'utilisateur:", error);
        }
    }

    // Déconnexion
    logoutButton.addEventListener('click', () => {
        sessionStorage.removeItem('token');
        alert("Déconnecté avec succès !");
        updateUI();
        window.location.href = '/'; // Redirige vers la page d'accueil
    });

    // Basculer entre connexion et enregistrement
    toggleAuthLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (loginForm.style.display === 'none') {
            loginForm.style.display = 'block';
            registrationForm.style.display = 'none';
            authTitle.textContent = "Connexion";
            toggleAuthLink.textContent = "Pas encore de compte ? S'inscrire";
        } else {
            loginForm.style.display = 'none';
            registrationForm.style.display = 'block';
            authTitle.textContent = "S'inscrire";
            toggleAuthLink.textContent = "Déjà inscrit ? Se connecter";
        }
    });

    // Retourner à la page d'accueil depuis le profil utilisateur
    document.getElementById('back-to-home').addEventListener('click', () => {
        userProfile.style.display = 'none';
        homePage.style.display = 'block';
        fetchUsers();  // Recharge la liste des utilisateurs
    });

    // Ouvre et ferme le bloc de connexion/enregistrement
    document.getElementById('show-auth').addEventListener('click', () => {
        authContainer.style.display = 'block';
    });
    closeAuthButton.addEventListener('click', () => {
        authContainer.style.display = 'none';
    });

    // Connexion - Nouveau code pour remplacer ta fonction
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        console.log("Username:", username, "Password:", password);

        try {
            const response = await fetch('/users_api/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const data = await response.json();
                sessionStorage.setItem('token', data.access);  // Stocke le token JWT
                alert("Connexion réussie !");
                updateUI();
                fetchUsers();  // Recharge la liste des utilisateurs après connexion
            } else {
                alert("Connexion échouée. Vérifiez vos identifiants.");
            }
        } catch (error) {
            console.error("Erreur lors de la connexion:", error);
        }
    });

    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
    
        if (password !== confirmPassword) {
            alert("Les mots de passe ne correspondent pas.");
            return;
        }
    
        try {
            const response = await fetch('/users_api/register/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, confirm_password: confirmPassword })
            });
    
            if (response.ok) {
                alert("Inscription réussie !");
                registrationForm.style.display = 'none';
                homePage.style.display = 'block';
            } else {
                const errorData = await response.json();
                alert(`Erreur lors de l'inscription: ${errorData.detail || 'Erreur inconnue'}`);
            }
        } catch (error) {
            alert("Erreur réseau. Veuillez réessayer plus tard.");
            console.error(error);
        }
    });

    // Récupérer l'ID utilisateur depuis l'URL actuelle
    function getUserIdFromURL() {
        const urlParts = window.location.pathname.split('/'); // Diviser l'URL par "/"
        return urlParts[urlParts.length - 1]; // Dernier élément, l'ID utilisateur
    }

    // Modifier les informations utilisateur
    document.getElementById('edit-profile').addEventListener('click', () => {
        document.getElementById('edit-form-container').style.display = 'block';
    });

    // Modifier le nom d'utilisateur
    document.getElementById('edit-username-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = getUserIdFromURL();
        console.log("ID utilisateur extrait de l'URL :", userId);
        const newUsername = document.getElementById('new-username').value;

        try {
            const response = await fetch(`/users_api/users/${userId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                },
                body: JSON.stringify({ username: newUsername })
            });

            if (response.ok) {
                alert("Nom d'utilisateur modifié !");
                updateUI();
            } else {
                alert("Erreur lors de la modification du nom d'utilisateur.");
            }
        } catch (error) {
            console.error("Erreur lors de la modification du nom d'utilisateur:", error);
        }
    });

    // Modifier le mot de passe
    document.getElementById('edit-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;

        try {
            const response = await fetch('/users_api/users/me/password/', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                },
                body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
            });

            if (response.ok) {
                alert("Mot de passe modifié !");
                updateUI();
            } else {
                alert("Erreur lors de la modification du mot de passe.");
            }
        } catch (error) {
            console.error("Erreur lors de la modification du mot de passe:", error);
        }
    });

    // Modifier l'avatar
    document.getElementById('edit-avatar-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newAvatar = document.getElementById('new-avatar').files[0];

        const formData = new FormData();
        formData.append('avatar', newAvatar);

        try {
            const response = await fetch('/users_api/users/4/', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                },
                body: formData
            });

            if (response.ok) {
                alert("Avatar modifié !");
                updateUI();
            } else {
                alert("Erreur lors de la modification de l'avatar.");
            }
        } catch (error) {
            console.error("Erreur lors de la modification de l'avatar:", error);
        }
    });

    // Supprimer un ami
    document.getElementById('friend-list').addEventListener('click', async (e) => {
        if (e.target.classList.contains('remove-friend')) {
            const friendId = e.target.dataset.friendId;
            const confirmation = confirm("Êtes-vous sûr de vouloir supprimer cet ami ?");
            if (confirmation) {
                try {
                    const response = await fetch(`/users_api/users/me/friends/${friendId}/`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                        }
                    });

                    if (response.ok) {
                        alert("Ami supprimé !");
                        fetchUserDetails();  // Rafraîchir les détails de l'utilisateur
                    } else {
                        alert("Erreur lors de la suppression de l'ami.");
                    }
                } catch (error) {
                    console.error("Erreur lors de la suppression de l'ami:", error);
                }
            }
        }
    });

    // Initialisation
    fetchUsers();
});