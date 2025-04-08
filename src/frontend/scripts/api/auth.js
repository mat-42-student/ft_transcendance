import { state, ft_fetch } from '../main.js';
import { cleanErrorMessage } from '../components/auth_form.js';
import { closeDynamicCard } from '../components/dynamic_card.js';

// Verify token via API
export async function verifyToken(token) {
    const response = await fetch('/api/v1/auth/verify/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.client.accessToken}`,
        },
        body: JSON.stringify({}),
    });

    if (response.ok) {
        return response;
    } else {
        state.client.accessToken = null; // Invalidate token if verification fails
        return response;
    }
}

// 2FA
export function enroll2fa() {
    const token = state.client.accessToken;
    const qrSection = document.getElementById('qr-section');
    const verificationSection = document.getElementById('verification-section');
    const infoSection = document.getElementById('info-section');

    fetch('/api/v1/auth/2fa/enroll/', {
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

    fetch('api/v1/auth/2fa/verify/', {
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
            console.log("2FA has been enabled!");
            successPage.style.display = 'block';
            qrSection.style.display = 'none';
            verificationSection.style.display = 'none';
        } else {
            console.error("Error", data);
        }
    })
    .catch(error => console.error('Error:', error));
}

// Handle API requests for login/registration
export async function handleAuthSubmit(event) {
    event.preventDefault();
    cleanErrorMessage();

    const { username, email, password, confirm_password, hash } = getAuthFormData();

    // Password validation for registration
    if (hash === '#register' && password !== confirm_password) {
        displayErrorMessage("Passwords don't match");
        return;
    }

    const { apiUrl, payload } = getApiUrlAndPayload(hash, username, email, password, confirm_password);

    if (!apiUrl) {
        console.error('Unknown action for authentication form.');
        return;
    }

    try {
        const response = await sendAuthRequest(apiUrl, payload);
        if (response.ok) {
            const data = await response.json();
            await handleAuthResponse(data);
        } else {
            await handleAuthError(response);
        }
    } catch (error) {
        console.error('API request error:', error);
    }
}

// Get authentication form data
function getAuthFormData() {
    const username = document.getElementById('auth-username').value.trim();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const confirm_password = document.getElementById('auth-confirm-password').value.trim();
    const hash = window.location.hash || '#signin';
    return { username, email, password, confirm_password, hash };
}

// Get API URL and payload based on auth mode
function getApiUrlAndPayload(hash, username, email, password, confirm_password) {
    let apiUrl = '';
    let payload = {};
    
    if (hash === '#register') {
        apiUrl = '/api/v1/users/register/';
        payload = { username, email, password, confirm_password };
    } else if (hash === '#signin') {
        apiUrl = '/api/v1/auth/login/';
        payload = { email, password };
    }

    return { apiUrl, payload };
}

// Send authentication request to API
async function sendAuthRequest(apiUrl, payload) {
    return await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

// Process authentication response (successful login/registration)
async function handleAuthResponse(data) {
    try {
        await state.client.login(data.accessToken);
        window.location.hash = '#profile';
        closeDynamicCard();
    } catch (error) {
        console.error('Error processing authentication response:', error);
    }
}

// Handle authentication errors (2FA/user errors)
async function handleAuthError(response) {
    const errorData = await response.json();
    
    if (errorData.error === '2fa_required') {
        handle2FA(response);
    } else if (errorData.detail === 'User not found' || errorData.detail === 'Incorrect password') {
        displayErrorMessage("Incorrect username or password.");
    } else {
        if (errorData.username || errorData.email) {
            displayErrorMessage("Username or email already taken.");
        } else {
            console.error('API Error:', errorData);
        }
    }
}

// Handle 2FA activation if required
function handle2FA(response) {
    const totpContainer = document.getElementById('totp-container');
    totpContainer.classList.remove('hidden');
    
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const totp = document.getElementById('auth-totp').value.trim();

    const payload = { email, password, totp };

    sendAuthRequest('/api/v1/auth/login/', payload)
        .then(response => response.json())
        .then(data => handleAuthResponse(data))
        .catch(error => console.error('Error during 2FA:', error));
}

// Display generic error message in form
function displayErrorMessage(message) {
    const loginErrorContainer = document.getElementById('auth-error');
    loginErrorContainer.textContent = message;
    loginErrorContainer.classList.remove('hidden');
}