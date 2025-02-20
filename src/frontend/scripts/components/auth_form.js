import { handleAuthSubmit } from "../api/auth.js";
import { cleanErrorMessage } from '../utils.js';

// Attache l'écouteur au formulaire d'authentification
export function initAuthFormListeners() {
    const authForm = document.querySelector('#auth-form form');
    if (authForm) {
        authForm.addEventListener('submit', handleAuthSubmit);
    }
}

export function updateAuthForm(mode) {
    const formTitle = document.getElementById('form-title');
    const confirmPasswordContainer = document.getElementById('confirm-password-container');
    const confirmUsernameContainer = document.getElementById('username-container');
    const authSubmit = document.getElementById('auth-submit');
    const registerLink = document.querySelector('a[data-action="register"]');
    const signinLink = document.querySelector('a[data-action="signin"]');
    const confirmPasswordInput = document.getElementById('auth-confirm-password');
    const signInWith42Button = document.getElementById('oauth-submit');

    // Définir mode par défaut si absent ou incorrect
    if (!mode || (mode !== '#register' && mode !== '#signin')) {
        mode = 'signin';
    }

    if (mode === '#register') {
        cleanErrorMessage();

        formTitle.textContent = 'Sign Up';
        confirmPasswordContainer.classList.remove('hidden'); // Affiche la confirmation du mot de passe
        confirmUsernameContainer.classList.remove('hidden'); // Affiche le username
        confirmPasswordInput.setAttribute('required', 'required');
        authSubmit.textContent = 'Sign Up';

        // Affiche uniquement le lien pour la connexion
        registerLink.classList.add('hidden');
        signinLink.classList.remove('hidden');

        signInWith42Button.classList.add('hidden');
    } else { // Par défaut : mode "signin"
        cleanErrorMessage();

        formTitle.textContent = 'Sign In';
        confirmPasswordContainer.classList.add('hidden'); // Cache la confirmation du mot de passe
        confirmUsernameContainer.classList.add('hidden'); // Cache le username
        confirmPasswordInput.removeAttribute('required');
        signInWith42Button.classList.remove('hidden');
        authSubmit.textContent = 'Sign In';

        // Affiche uniquement le lien pour l'inscription
        registerLink.classList.remove('hidden');
        signinLink.classList.add('hidden');
    }
    window.history.replaceState({}, '', `${mode}`);
}