import { state } from '../main.js';
import { cleanErrorMessage } from '../components/auth_form.js';
import { closeDynamicCard } from '../components/dynamic_card.js';
import { toggle2faButton } from '../pages.js';

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
        state.client.accessToken = null;
        return response;
    }
}

export async function enroll2fa() {
    const token = state.client.accessToken;
    const qrSection = document.getElementById('qr-section');
    const verificationSection = document.getElementById('verification-section');
    const infoSection = document.getElementById('info-section');

    if (!qrSection || !verificationSection || !infoSection) {
        return;
    }
    
    try {
      const response = await fetch('/api/v1/auth/2fa/enroll/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      
      const data = await response.json();

      if (data.message == '2FA is already enabled.') {
        display2faErrorMessage("2FA is already enabled");
        return;
      }
      
      if (data.success) {
        const qrCodeImage = `data:image/png;base64,${data.qr_code}`;
        document.getElementById('qr-image').src = qrCodeImage;
        qrSection.style.display = 'block';
        verificationSection.style.display = 'block';
        infoSection.style.display = 'none';
      } else {
        console.error("Error", data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
}

export async function verify2fa() {
    const token = state.client.accessToken;
    const totp = document.getElementById('totp-code').value;
    const successPage = document.getElementById('2fa-success');
    const qrSection = document.getElementById('qr-section');
    const verificationSection = document.getElementById('verification-section');
    const twoFAErrorContainer = document.getElementById('2fa-error');

    if (!totp || !successPage || !qrSection || !verificationSection || !twoFAErrorContainer) {
        return;
    }
    
    try {
      const response = await fetch('api/v1/auth/2fa/verify/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ totp }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        twoFAErrorContainer.style.display = 'none'
        successPage.style.display = 'block';
        qrSection.style.display = 'none';
        verificationSection.style.display = 'none';
        toggle2faButton();
      } else if (data.error == "Invalid or expired 2FA code") {
        display2faErrorMessage("Invalid or expired 2FA code");
      } else {
        console.error("Error", data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
}

export async function disable2fa() {
    const token = state.client.accessToken;
    const password = document.getElementById('disable-2fa-password').value;
    const totp = document.getElementById('disable-2fa-totp').value;
    const formSection = document.getElementById('disable-2fa-form-section');
    const errorSection = document.getElementById('disable-2fa-error');
    const successSection = document.getElementById('disable-2fa-success');

    if (!password || !totp || !formSection || !errorSection || !successSection) {
        return;
    }
    
    try {
        const response = await fetch('/api/v1/auth/2fa/disable/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ 
                password: password,
                totp: totp 
            }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (formSection) formSection.style.display = 'none';
            if (errorSection) errorSection.style.display = 'none';
            if (successSection) successSection.style.display = 'block';
            toggle2faButton();
        } else {
            if (errorSection) {
                if (data.error === "Invalid password") {
                        const errorSection = document.getElementById('disable-2fa-error');
                        errorSection.textContent = "The password you entered is incorrect.";
                        errorSection.classList.remove('hidden');
                } else if (data.error === "Invalid 2FA code") {
                        const errorSection = document.getElementById('disable-2fa-error');
                        errorSection.textContent = "The verification code is invalid or has expired.";
                        errorSection.classList.remove('hidden');
                } else {
                    errorSection.textContent = data.error || 'Failed to disable 2FA';
                }
            }
        }
    } catch (error) {
        if (errorSection) {
            errorSection.textContent = 'An error occurred while disabling 2FA';
            errorSection.style.display = 'block';
        }
    }
}

export function validatePassword(password) {
    if (password.length < 8) {
      return "Password must be at least 8 characters long.";
    }
    
    if (password.length > 128) {
      return "Password too long.";
    }
    
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter.";
    }
    
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter.";
    }
    
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number.";
    }
    
    const specialChars = "!@#$%^&*()-_=+[]{}|;:'\",.<>/?";
    if (!password.split('').some(char => specialChars.includes(char))) {
      return "Password must contain at least one special character.";
    }
    
    const commonPatterns = ['password', '123456', 'qwerty', 'admin'];
    if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
      return "Password contains a common pattern and is too weak.";
    }
    
    return null;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,63}$/;
    
    if (!email || typeof email !== 'string') {
      return false;
    }
    
    const trimmedEmail = email.trim();
    
    if (trimmedEmail.length === 0) {
      return false;
    }
    
    return emailRegex.test(trimmedEmail);
}

function validateEmail(email) {
    if (email.length < 5) {
        return "Email must be at least 5 characters long.";
    }
    
    if (email.length > 100) {
        return "Email too long.";
    }

    if (!isValidEmail(email)) {
        return "Enter a valid email address."
    }
}

function validateUsername(username) {
    if (username.length < 2) {
        return "Username must be at least 5 characters long.";
    }

    if (username.length > 50) {
        return "Username too long.";
    }
}

// Handle API requests for login/registration
export async function handleAuthSubmit(event) {
    event.preventDefault();
    cleanErrorMessage();

    const username = document.getElementById('auth-username')?.value.trim();
    const email = document.getElementById('auth-email')?.value.trim();
    const password = document.getElementById('auth-password')?.value.trim();
    const confirm_password = document.getElementById('auth-confirm-password')?.value.trim();
    const totp = document.getElementById('auth-totp')?.value.trim();

    if (window.authMode === 'twoFactorAuth') {
        if (!totp || totp.length === 0) {
            displayErrorMessage("Please enter your 2FA verification code.");
            return;
        }

        const payload = { email, password, totp };

        try {
            const response = await sendAuthRequest('/api/v1/auth/login/', payload);
            
            if (response.ok) {
                const data = await response.json();
                await handleAuthResponse(data);
            } else {
                const errorData = await response.json();
                if (errorData.detail === "invalid_totp" || errorData.error === "invalid_totp") {
                    displayErrorMessage("Invalid verification code. Please try again.");
                } else {
                    displayErrorMessage(errorData.detail || "Verification failed. Please try again.");
                }
            }
        } catch (error) {
            console.error('2FA verification error:', error.message || 'Unknown error');
            displayErrorMessage("Error during verification. Please try again.");
        }
        
        return;
    }

    const usernameError = validateUsername(username);
    if (window.authMode === 'register' && usernameError) {
        displayErrorMessage(usernameError);
        return;
    }
    
    const emailError = validateEmail(email);
    if (window.authMode === 'register' && emailError) {
        displayErrorMessage(emailError);
        return;
    }
    
    if (window.authMode === 'register' && password !== confirm_password) {
        displayErrorMessage("Passwords don't match");
        return;
    }

    const passwordError = validatePassword(password);
    if (window.authMode === 'register' && passwordError) {
        displayErrorMessage(passwordError);
        return;
    }

    let apiUrl = '';
    let payload = {};
    if (window.authMode === 'register') {
        apiUrl = '/api/v1/users/register/';
        payload = { username, email, password, confirm_password };
    } else if (window.authMode === 'signin') {
        apiUrl = '/api/v1/auth/login/';
        payload = { email, password };
    }

    if (!apiUrl) {
        displayErrorMessage('Invalid authentication action.');
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
        return { success: false, message: 'Authentication failed' };
    }
}

async function sendAuthRequest(apiUrl, payload) {
    return await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin'
    });
}

async function handleAuthResponse(data) {
    try {
        await state.client.login(data.accessToken);
        window.location.hash = '#profile';
        closeDynamicCard();
    } catch (error) {
        displayErrorMessage("Error during login. Please try again.");
        return { success: false };
    }
}

async function handleAuthError(response) {
    try {
        if (response.status === 0) {
            displayErrorMessage("Network error. Please check your connection and try again.");
            return { success: false };
        }

        const errorData = await response.json();
        
        if (errorData.error === '2fa_required!') {
            handle2FA(response);
            return { success: false, twoFactorRequired: true };
        } else if (errorData.detail === 'User not found!' || errorData.detail === 'Incorrect password') {
            displayErrorMessage("Incorrect email or password.");
        } else if (errorData.error === 'User already logged in') {
            displayErrorMessage("User already logged in.");
        } else if (errorData.username || errorData.email) {
            if (errorData.username && errorData.username.length > 0) {
                if (window.authMode === 'signin')
                    displayErrorMessage("Authentication failed. Please try again.");
                else
                    displayErrorMessage("Registration failed. Please try again.");
            }
            if (errorData.email && errorData.email.length > 0) {
                if (window.authMode === 'signin')
                    displayErrorMessage("Authentication failed. Please try again.");
                else
                    displayErrorMessage("Registration failed. Please try again.");
            }
        } else {
            if (window.authMode === 'signin')
                displayErrorMessage("Authentication failed. Please try again.");
            else
                displayErrorMessage("Registration failed. Please try again.");

        }
        
        return { success: false, error: errorData };
    } catch (error) {
        displayErrorMessage("Authentication failed. Please try again.");
        return { success: false, error: { message: response.statusText || "Unknown error" } };
    }
}

function handle2FA(response) {
    const totpContainer = document.getElementById('totp-container');

    if (!totpContainer) {
        return;
    }

    totpContainer.classList.remove('hidden');

    const submitButton = document.getElementById('auth-submit');

    if (!submitButton) {
        return;
    }

    if (submitButton) {
        submitButton.textContent = 'Verify 2FA';
    }

    window.authMode = 'twoFactorAuth';

    const totpInput = document.getElementById('auth-totp');

    if (!totpInput) {
        return;
    }

    if (totpInput) {
        totpInput.focus();
    }
}

export function displayErrorMessage(message) {
    const loginErrorContainer = document.getElementById('auth-error');

    if (!loginErrorContainer) {
        return;
    }

    loginErrorContainer.textContent = message;
    loginErrorContainer.classList.remove('hidden');
}

export function display2faErrorMessage(message) {
    const twofaErrorContainer = document.getElementById('2fa-error');

    if (!twofaErrorContainer) {
        return;
    }
    
    twofaErrorContainer.textContent = message;
    twofaErrorContainer.classList.remove('hidden');
}