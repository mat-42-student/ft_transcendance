import { handleAuthSubmit } from "../api/auth.js";

// Fonction pour nettoyer les messages d'erreur
export function cleanErrorMessage() {
    const loginErrorContainer = document.getElementById('auth-error');
    if (loginErrorContainer) {
        loginErrorContainer.textContent = "";
        loginErrorContainer.classList.add('hidden');
    }
}

// Attache l'écouteur au formulaire d'authentification
export function initAuthFormListeners() {
    const authForm = document.querySelector('#auth-form form');
    authForm?.addEventListener('submit', handleAuthSubmit);
    updateAuthForm("signin");
    document.getElementById("register-link").onclick = () => { updateAuthForm("register"); };
    document.getElementById("signin-link").onclick = () => { updateAuthForm("signin"); };
}

// Met à jour le formulaire en fonction du mode (inscription ou connexion)
export function updateAuthForm(mode) {
    window.authMode = mode;

    try {  // Dev account textbox
        const devAccountButton = document.getElementById('dev-account');
        devAccountButton.oninput = (e) => {
            const name = e.target.value;
            if (name != "") {
                document.getElementById('auth-username').value = `${name}`;
                document.getElementById('auth-email').value = `${name}@dev.com`;
                const pw = 'Test123*';  // cybersecurity is my passion
                document.getElementById('auth-password').value = pw;
                document.getElementById('auth-confirm-password').value = pw;
            }
        }
    } catch {} // Dev account textbox

    cleanErrorMessage();
    updateFormTitleAndButton();
    togglePasswordAndUsernameFields();
    toggleExternalLinks();
}

// Met à jour le titre et le bouton de soumission en fonction du mode
function updateFormTitleAndButton() {
    const formTitle = document.getElementById('form-title');
    const authSubmit = document.getElementById('auth-submit');
    
    if (window.authMode === 'register') {
        formTitle.textContent = 'Sign Up';
        authSubmit.textContent = 'Sign Up';
    } else if (window.authMode === 'signin') {
        formTitle.textContent = 'Sign In';
        authSubmit.textContent = 'Sign In';
    }
}

// Gère la visibilité des champs de mot de passe et de nom d'utilisateur
function togglePasswordAndUsernameFields() {
    const confirmPasswordContainer = document.getElementById('confirm-password-container');
    const confirmUsernameContainer = document.getElementById('username-container');
    const confirmPasswordInput = document.getElementById('auth-confirm-password');
    
    if (window.authMode === 'register') {
        confirmPasswordContainer.classList.remove('hidden');
        confirmUsernameContainer.classList.remove('hidden');
        confirmPasswordInput.required = true;
    } else if (window.authMode === 'signin') {
        confirmPasswordContainer.classList.add('hidden');
        confirmUsernameContainer.classList.add('hidden');
        confirmPasswordInput.removeAttribute('required');
    }
}

// Gère la visibilité des liens et des boutons externes
function toggleExternalLinks() {
    const signInWith42Button = document.getElementById('oauth-submit');
    const registerLink = document.querySelector('button[data-action="register"]');
    const signinLink = document.querySelector('button[data-action="signin"]');
    
    if (window.authMode === 'register') {
        registerLink.classList.add('hidden');
        signinLink.classList.remove('hidden');
        signInWith42Button.classList.add('hidden');
    } else if (window.authMode === 'signin') {
        registerLink.classList.remove('hidden');
        signinLink.classList.add('hidden');
        signInWith42Button.classList.remove('hidden');
    }
}