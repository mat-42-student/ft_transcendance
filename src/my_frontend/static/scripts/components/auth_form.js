import { handleAuthSubmit } from "../api/auth.js";

export function handleHashChange() {
    const hash = window.location.hash.slice(1); // Retire le '#' du hash
    if (hash === 'register') {
        updateAuthForm('register');
    } else {
        updateAuthForm('signin'); // Mode par défaut
    }
}

// Attache l'écouteur au formulaire d'authentification
export function initAuthFormListeners() {
    const authForm = document.querySelector('#auth-form form');
    if (authForm) {
        authForm.addEventListener('submit', handleAuthSubmit);
    }
}

// function updateAuthForm(mode) {
//     const formTitle = document.getElementById('form-title');
//     const confirmPasswordContainer = document.getElementById('confirm-password-container');
//     const authSubmit = document.getElementById('auth-submit');

//     if (mode === 'register') {
//         formTitle.textContent = 'Register';
//         confirmPasswordContainer.classList.remove('hidden'); // Affiche la confirmation du mot de passe
//         authSubmit.textContent = 'Register';
//     } else { // Par défaut : mode "signin"
//         formTitle.textContent = 'Sign In';
//         confirmPasswordContainer.classList.add('hidden'); // Cache la confirmation du mot de passe
//         authSubmit.textContent = 'Sign In';
//     }
// }

function updateAuthForm(mode) {
    const formTitle = document.getElementById('form-title');
    const confirmPasswordContainer = document.getElementById('confirm-password-container');
    const authSubmit = document.getElementById('auth-submit');
    const registerLink = document.querySelector('a[data-action="register"]');
    const signinLink = document.querySelector('a[data-action="signin"]');
    const confirmPasswordInput = document.getElementById('confirm-password');

    // Définir mode par défaut si absent ou incorrect
    if (!mode || (mode !== 'register' && mode !== 'signin')) {
        mode = 'signin';
    }

    if (mode === 'register') {
        formTitle.textContent = 'Register';
        confirmPasswordContainer.classList.remove('hidden'); // Affiche la confirmation du mot de passe
        confirmPasswordInput.setAttribute('required', 'required');
        authSubmit.textContent = 'Register';

        // Affiche uniquement le lien pour la connexion
        registerLink.classList.add('hidden');
        signinLink.classList.remove('hidden');
    } else { // Par défaut : mode "signin"
        formTitle.textContent = 'Sign In';
        confirmPasswordContainer.classList.add('hidden'); // Cache la confirmation du mot de passe
        confirmPasswordInput.removeAttribute('required');
        authSubmit.textContent = 'Sign In';

        // Affiche uniquement le lien pour l'inscription
        registerLink.classList.remove('hidden');
        signinLink.classList.add('hidden');
    }
}