import { state } from '../main.js';
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
            // console.log("2FA has been enabled!");
            successPage.style.display = 'block';
            qrSection.style.display = 'none';
            verificationSection.style.display = 'none';
        } else {
            console.error("Error", data);
        }
    })
    .catch(error => console.error('Error:', error));
}

export function validatePassword(password) {
    // Check for minimum length
    if (password.length < 8) {
      return "Password must be at least 8 characters long.";
    }
    
    // Check for maximum length
    if (password.length > 128) {
      return "Password too long.";
    }
    
    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter.";
    }
    
    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter.";
    }
    
    // Check for at least one digit
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number.";
    }
    
    // Check for at least one special character
    const specialChars = "!@#$%^&*()-_=+[]{}|;:'\",.<>/?";
    if (!password.split('').some(char => specialChars.includes(char))) {
      return "Password must contain at least one special character.";
    }
    
    // Check that password doesn't contain common patterns
    const commonPatterns = ['password', '123456', 'qwerty', 'admin'];
    if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
      return "Password contains a common pattern and is too weak.";
    }
    
    // If all checks pass
    return null;
}

function isValidEmail(email) {
    // Basic regex for email validation
    // This checks for:
    // - One or more characters before the @ symbol
    // - The @ symbol
    // - One or more characters for the domain name
    // - A dot followed by a top-level domain of 2-63 characters
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,63}$/;
    
    // Check if email is defined and is a string
    if (!email || typeof email !== 'string') {
      return false;
    }
    
    // Trim the email string to remove any leading/trailing whitespace
    const trimmedEmail = email.trim();
    
    // Check if the trimmed email is empty
    if (trimmedEmail.length === 0) {
      return false;
    }
    
    // Test the email against the regex pattern
    return emailRegex.test(trimmedEmail);
}

function validateEmail(email) {
    // Check for minimum length
    if (email.length < 5) {
        return "Email must be at least 5 characters long.";
    }
    
    // Check for maximum length
    if (email.length > 100) {
        return "Email too long.";
    }

    if (!isValidEmail(email)) {
        return "Enter a valid email address."
    }
}

function validateUsername(username) {
    // Check for minimum length
    if (username.length < 2) {
        return "Username must be at least 5 characters long.";
    }
    
    // Check for maximum length
    if (username.length > 50) {
        return "Username too long.";
    }
}

// Handle API requests for login/registration
export async function handleAuthSubmit(event) {
    event.preventDefault();
    cleanErrorMessage();

    const { username, email, password, confirm_password, hash } = getAuthFormData();
    const totp = document.getElementById('auth-totp').value.trim();

    // If we're in 2FA mode, handle it differently
    if (window.authMode === 'twoFactorAuth') {
        // Validate TOTP
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
                // Special handling for 2FA errors
                const errorData = await response.json();
                if (errorData.detail === "Invalid TOTP") {
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

    // Validate username requirements
    const usernameError = validateUsername(username);
    if (window.authMode === 'register' && usernameError) {
        displayErrorMessage(usernameError);
        return;
    }
    
    // Validate email requirements
    const emailError = validateEmail(email);
    if (window.authMode === 'register' && emailError) {
        displayErrorMessage(emailError);
        return;
    }
    
    // Password validation for registration
    if (window.authMode === 'register' && password !== confirm_password) {
        displayErrorMessage("Passwords don't match");
        return;
    }

    // Validate password requirements
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
        console.error('Authentication error:', error.message || 'Unknown error');
        return { success: false, message: 'Authentication failed' };
    }
}

// Get authentication form data
function getAuthFormData() {
    const username = document.getElementById('auth-username').value.trim();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const confirm_password = document.getElementById('auth-confirm-password').value.trim();
    const totp = document.getElementById('auth-totp').value.trim();
    const hash = window.location.hash;
    return { username, email, password, confirm_password, totp, hash };
}

// Send authentication request to API
async function sendAuthRequest(apiUrl, payload) {
    return await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        // Add credentials if you're using cookies for auth
        credentials: 'same-origin'
    });
}

// Process authentication response (successful login/registration)
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

// Handle backend authentication errors
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
            displayErrorMessage("Incorrect username or password.");
        } else if (errorData.error === 'User already logged in') {
            displayErrorMessage("User already logged in.");
        } else if (errorData.username || errorData.email) {
            if (errorData.email && errorData.email.length > 0) {
                displayErrorMessage(`Email: ${errorData.email[0]}`);
            }
            if (errorData.username && errorData.username.length > 0) {
                displayErrorMessage(`Username: ${errorData.username[0]}`);
            }
        } else {
            displayErrorMessage("Authentication failed. Please try again.");
        }
        
        return { success: false, error: errorData };
    } catch (error) {
        displayErrorMessage("Authentication failed. Please try again.");
        return { success: false, error: { message: response.statusText || "Unknown error" } };
    }
}

// Handle 2FA activation if required
function handle2FA(response) {
    const totpContainer = document.getElementById('totp-container');
    totpContainer.classList.remove('hidden');

    // Update the submit button text to reflect the action
    const submitButton = document.getElementById('auth-submit');
    if (submitButton) {
        submitButton.textContent = 'Verify 2FA';
    }

    // Store information that we're in 2FA mode
    window.authMode = 'twoFactorAuth';

    // Focus the TOTP input for better UX
    const totpInput = document.getElementById('auth-totp');
    if (totpInput) {
        totpInput.focus();
    }
}

// Display generic error message in form
function displayErrorMessage(message) {
    const loginErrorContainer = document.getElementById('auth-error');
    loginErrorContainer.textContent = message;
    loginErrorContainer.classList.remove('hidden');
}