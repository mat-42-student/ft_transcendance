import { closeDynamicCard } from '../components/dynamic_card.js';

// Vérifie si l'utilisateur est authentifié en regardant le token dans sessionStorage
export async function isAuthenticated() {
    const token = sessionStorage.getItem('authToken');
    if (!token) {
        console.log("isAuthenticated() FALSE no token"); // debug
        return false;
    }

    try {
        const response = await fetch('/users_api/token/verify/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'token': `${token}`,
            },
            body: JSON.stringify({ token }),
        });

        if (response.ok) {
            console.log("isAuthenticated() TRUE response ok"); // debug
            return true;
        } else {
            sessionStorage.removeItem('authToken');
            console.log("isAuthenticated() FALSE response not ok rm token"); // debug
            return false;
        }
    } catch (error) {
        console.error('Erreur lors de la vérification du token:', error);
        console.log("isAuthenticated() FALSE erreur pendant verif token"); // debug
        return false;
    }
}

// Logout function
export function logout() {
    sessionStorage.removeItem('authToken');
    console.log("Déconnecté avec succès !");
    window.location.hash = '#home';
    // updateUI();
}

// Fonction d'envoi des requêtes API pour connexion ou enregistrement
export async function handleAuthSubmit(event) {
    event.preventDefault(); // Empêche le rechargement de la page

    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const confirmPassword = document.getElementById('confirm-password').value.trim();
    const hash = window.location.hash;

    if (!username || !password) {
        alert('Veuillez remplir tous les champs obligatoires.');
        return;
    }

    // Définit un hash par défaut si absent
    if (!hash || (hash !== '#register' && hash !== '#signin')) {
        hash = '#signin';
        window.location.hash = hash;
    }

    if (hash === '#register' && password !== confirmPassword) {
        alert('Les mots de passe ne correspondent pas.');
        return;
    }

    let apiUrl, payload;

    if (hash === '#register') {
        apiUrl = '/users_api/register/';
        payload = { username, password, confirmPassword };
    } else if (hash === '#signin') {
        apiUrl = '/users_api/login/';
        payload = { username, password };
    } else {
        console.error('Action inconnue pour le formulaire d\'authentification.');
        return;
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            const data = await response.json();
            sessionStorage.setItem('authToken', data.access);  // Stocke le token JWT
            console.log("Connexion réussie !");
            window.location.hash = '#profile';
            // updateUI();
            // fetchUsers();
        } else {
            alert(`Erreur : ${errorData.message || 'Une erreur est survenue.'}`);
            if (!data.token)
                console.log('Aucun token reçu. Veuillez réessayer.');
            return;
        }
        closeDynamicCard();
    } catch (error) {
        console.error('Erreur lors de la requête API :', error);
        alert('Une erreur est survenue. Veuillez réessayer.');
    }
}