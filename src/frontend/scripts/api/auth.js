import { closeDynamicCard } from '../components/dynamic_card.js';
import { fetchFriends } from './users.js';
import { MainSocket } from '../MainSocket.js';
import { state } from '../main.js'

// Vérifie si l'utilisateur est authentifié par la presence de accessToken
export async function isAuthenticated() {
    const token = state.client.accessToken;
    if (!token) {
        return false;
    }

    try {
        const response = await fetch('/api/v1/auth/verify/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({}),
        });

        if (response.ok) {
            return true;
        } else {
            // sessionStorage.removeItem('accessToken');
            state.client.accessToken = null;
            return false;
        }
    } catch (error) {
        console.error('Erreur lors de la vérification du token:', error);
        return false;
    }
}

export function logout() {
    fetch('https://localhost:3000/api/v1/auth/logout/', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // sessionStorage.removeItem('accessToken');
            state.client.accessToken = null;
        }
    })
    .catch(error => console.error('Error:', error));
    // console.log("Déconnecté avec succès !");
    window.location.hash = '#home';
    // updateUI();
}

// function extractUserIdFromJWT(token) {
//     const parts = token.split('.');
  
//     if (parts.length !== 3) {
//       throw new Error('Invalid JWT format');
//     }

//     const payload = parts[1];
//     const decodedPayload = atob(payload);
//     const parsedPayload = JSON.parse(decodedPayload);
//     return parsedPayload.id;
// }

function extractUserDataFromJWT(token) {
    const parts = token.split('.');
  
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = parts[1];
    const decodedPayload = atob(payload);
    const parsedPayload = JSON.parse(decodedPayload);
    return {'id':parsedPayload.id, 'username':parsedPayload.username};
}

export function changeProfileBtn(label){
    document.getElementById('btn-profile').innerText = label;
}

// Fonction d'envoi des requêtes API pour connexion ou enregistrement
export async function handleAuthSubmit(event) {
    event.preventDefault(); // Empêche le rechargement de la page

    const username = document.getElementById('auth-username').value.trim();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const totpContainer = document.getElementById('totp-container');
    const confirm_password = document.getElementById('auth-confirm-password').value.trim();
    const hash = window.location.hash;

    if (!email || !password) {
        alert('Veuillez remplir tous les champs obligatoires.');
        return;
    }

    // Définit un hash par défaut si absent
    if (!hash || (hash !== '#register' && hash !== '#signin')) {
        hash = '#signin';
        window.location.hash = hash;
    }

    if (hash === '#register' && password !== confirm_password) {
        alert('Les mots de passe ne correspondent pas.');
        return;
    }

    let apiUrl, payload;

    if (hash === '#register') {
        apiUrl = '/api/v1/users/register/';
        payload = { username, email, password, confirm_password };
    } else if (hash === '#signin') {
        apiUrl = '/api/v1/auth/login/';
        payload = { email, password };
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

        // console.log(JSON.stringify(payload)); // DEBUG

        if (response.ok) {
            const data = await response.json();
            // console.log(`token given: ` + data.accessToken);
            state.client.accessToken = data.accessToken;
            window.location.hash = '#profile';
            
            let userData = extractUserDataFromJWT(data.accessToken);
            state.client.userId = userData.id;
            state.client.userName = userData.username;
            
            changeProfileBtn(state.client.userName);
            fetchFriends(state.client.userId);
            // updateUI();
            // fetchUsers();
			state.mainSocket = new MainSocket();
            closeDynamicCard();
        } else {
            const errorData = await response.json();  // Récupère le corps de la réponse d'erreur

            if (errorData && errorData.error === '2fa_required!') {
                const totp = document.getElementById('auth-totp').value.trim();
                apiUrl = '/api/v1/auth/login/';
                payload = { email, password, totp };
                totpContainer.classList.remove('hidden');

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', },
                    body: JSON.stringify(payload),
                });

                // console.log(JSON.stringify(payload)); // DEBUG


                if (response.ok) {
                    const data = await response.json();
                    state.client.accessToken = data.accessToken;
                    window.location.hash = '#profile';
        
                    let userData = extractUserDataFromJWT(data.accessToken);
                    state.client.userId = userData.id;
                    state.client.userName = userData.username;
        
                    fetchFriends(state.client.userId); // Charge la liste d'amis après authentification
                    // updateUI();
                    // fetchUsers();
                    state.client.accessToken = data.accessToken;
                    state.mainSocket = new MainSocket();
                    closeDynamicCard();
                } else {
                    const errorData = await response.json();  // Récupère le corps de la réponse d'erreur
                    console.error('Erreur API:', errorData); // Log l'erreur pour débogage
                    return;
                }

            } else {
                console.error('Erreur API:', errorData); // Log l'erreur pour débogage
                return;
            }
            // alert(`Erreur : ${errorData.message || 'Une erreur est survenue.'}`);
        }
        // closeDynamicCard();
    } catch (error) {
        console.error('Erreur lors de la requête API :', error);
        // alert('Une erreur est survenue. Veuillez réessayer.');
    }
}

// --- 2FA ---
export function enroll2fa() {
    const token = state.client.accessToken;
    const qrSection = document.getElementById('qr-section');
    const verificationSection = document.getElementById('verification-section');
    const infoSection = document.getElementById('info-section');

    fetch('https://localhost:3000/api/v1/auth/2fa/enroll/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const qrCodeImage = `data:image/png;base64,${data.qr_code}`;
            document.getElementById('qr-image').src = qrCodeImage;
            qrSection.style.display = 'block';
            verificationSection.style.display = 'block';
            infoSection.style.display = 'none';
        } else {
            console.error("Error", data);
            // alert(data.message);
        }
    })
    .catch(error => console.error('Error:', error));
}

export function verify2fa() {
    const token = state.client.accessToken;
    const totp = document.getElementById('totp-code').value;
    const successPage = document.getElementById('2fa-success');
    const qrSection = document.getElementById('qr-section');
    const verificationSection = document.getElementById('verification-section');


    fetch('https://localhost:3000/api/v1/auth/2fa/verify/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ totp }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log("2fa has been enabled!")
            successPage.style.display = 'block';
            qrSection.style.display = 'none';
            verificationSection.style.display = 'none';
        } else {
            console.error("Error", data);
        }
    })
    .catch(error => console.error('Error:', error));
}