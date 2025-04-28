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
}

// Met à jour le formulaire en fonction du mode (inscription ou connexion)
export function updateAuthForm(mode = window.location.hash || '#signin') {
    cleanErrorMessage();
    updateFormTitleAndButton(mode);
    togglePasswordAndUsernameFields(mode);
    toggleExternalLinks(mode);

    // Mise à jour de l'URL sans recharger la page
    window.history.replaceState({}, '', mode);
}

// Met à jour le titre et le bouton de soumission en fonction du mode
function updateFormTitleAndButton(mode) {
    const formTitle = document.getElementById('form-title');
    const authSubmit = document.getElementById('auth-submit');
    
    if (mode === '#register') {
        formTitle.textContent = 'Sign Up';
        authSubmit.textContent = 'Sign Up';
    } else if (mode === '#signin') {
        formTitle.textContent = 'Sign In';
        authSubmit.textContent = 'Sign In';
    }
}

// Gère la visibilité des champs de mot de passe et de nom d'utilisateur
function togglePasswordAndUsernameFields(mode) {
    const confirmPasswordContainer = document.getElementById('confirm-password-container');
    const confirmUsernameContainer = document.getElementById('username-container');
    const confirmPasswordInput = document.getElementById('auth-confirm-password');
    
    if (mode === '#register') {
        confirmPasswordContainer.classList.remove('hidden');
        confirmUsernameContainer.classList.remove('hidden');
        confirmPasswordInput.required = true;
    } else if (mode === '#signin') {
        confirmPasswordContainer.classList.add('hidden');
        confirmUsernameContainer.classList.add('hidden');
        confirmPasswordInput.removeAttribute('required');
    }
}

// Gère la visibilité des liens et des boutons externes
function toggleExternalLinks(mode) {
    const signInWith42Button = document.getElementById('oauth-submit');
    const registerLink = document.querySelector('a[data-action="register"]');
    const signinLink = document.querySelector('a[data-action="signin"]');
    
    if (mode === '#register') {
        registerLink.classList.add('hidden');
        signinLink.classList.remove('hidden');
        signInWith42Button.classList.add('hidden');
    } else if (mode === '#signin') {
        registerLink.classList.remove('hidden');
        signinLink.classList.add('hidden');
        signInWith42Button.classList.remove('hidden');
    }
}