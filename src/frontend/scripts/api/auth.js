import { closeDynamicCard } from '../components/dynamic_card.js';
import { state } from '../main.js';
import { cleanErrorMessage } from '../utils.js';

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
            state.client.accessToken = null;
            return false;
        }
    } catch (error) {
        console.error('Erreur lors de la vérification du token:', error);
        return false;
    }
}

// Fonction d'envoi des requêtes API pour connexion ou enregistrement
export async function handleAuthSubmit(event) {
    event.preventDefault();
    cleanErrorMessage();

    const username = document.getElementById('auth-username').value.trim();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const totpContainer = document.getElementById('totp-container');
    const confirm_password = document.getElementById('auth-confirm-password').value.trim();
    const hash = window.location.hash;

    if (!hash || (hash !== '#register' && hash !== '#signin')) {
        hash = '#signin';
        window.location.hash = hash;
    }

    if (hash === '#register' && password !== confirm_password) {
        const loginErrorContainer = document.getElementById('auth-error');
        loginErrorContainer.textContent = "Passwords don't match";
        loginErrorContainer.classList.remove('hidden');
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
        if (response.ok) {
            const data = await response.json();
            try {
                await state.client.login(data.accessToken);
            }
            catch (error) {
                console.error(error);
            }
            window.location.hash = '#profile';
            // fetchUsers();
            closeDynamicCard();
        } else {
            const errorData = await response.json();

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
                if (response.ok) {
                    const data = await response.json();
                    try {
                        await state.client.login(data.accessToken);
                    }
                    catch (error) {
                        console.error(error);
                    }
                    window.location.hash = '#profile';
                    // fetchUsers();
                    closeDynamicCard();        
                } else {
                    const errorData = await response.json();
                    console.error('Erreur API:', errorData);
                    return;
                }
            } else if (errorData && (errorData.detail === 'User not found!' || errorData.detail === 'Incorrect password!')){
                const loginErrorContainer = document.getElementById('auth-error');
                loginErrorContainer.textContent = "Incorrect username or password";
                loginErrorContainer.classList.remove('hidden');
                return;

            } else {
                console.error('Erreur API:', errorData);
                return;
            }
        }
    } catch (error) {
        console.error('Erreur lors de la requête API :', error);
    }
}

// 2FA
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
