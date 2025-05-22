    import { handleAuthSubmit } from "../api/auth.js";

    // Function to clear error messages
    export function cleanErrorMessage() {
        const loginErrorContainer = document.getElementById('auth-error');
        if (loginErrorContainer) {
            loginErrorContainer.textContent = "";
            loginErrorContainer.classList.add('hidden');
        }
    }

    export function initAuthFormListeners() {
        const authForm = document.querySelector('#auth-form form');
        authForm?.addEventListener('submit', handleAuthSubmit);
        updateAuthForm("signin");
        
        document.getElementById("register-link")?.addEventListener('click', () => updateAuthForm("register"));
        document.getElementById("signin-link")?.addEventListener('click', () => updateAuthForm("signin"));
    }

    // Updates the form based on mode (signup/signin)
    export function updateAuthForm(mode) {
        window.authMode = mode;

        try {
            const devAccountButton = document.getElementById('dev-account');
            devAccountButton?.addEventListener('input', (e) => {
                const name = e.target.value;
                if (name) {
                    document.getElementById('auth-username').value = name;
                    document.getElementById('auth-email').value = `${name}@dev.com`;
                    const pw = 'Test123*';
                    document.getElementById('auth-password').value = pw;
                    document.getElementById('auth-confirm-password').value = pw;
                }
            });
        } catch (error) {
            console.error("Dev account input error:", error);
        }

        cleanErrorMessage();
        updateFormTitleAndButton();
        togglePasswordAndUsernameFields();
        toggleExternalLinks();
    }

    // Updates the form title and submit button based on mode
    function updateFormTitleAndButton() {
        const formTitle = document.getElementById('form-title');
        const authSubmit = document.getElementById('auth-submit');

        if (!formTitle || !authSubmit) {
            return;
        }
        
        if (window.authMode === 'register') {
            formTitle.textContent = 'Sign Up';
            authSubmit.textContent = 'Sign Up';
        } else {
            formTitle.textContent = 'Sign In';
            authSubmit.textContent = 'Sign In';
        }
    }

    // Toggles password/username fields visibility
    function togglePasswordAndUsernameFields() {
        const confirmPasswordContainer = document.getElementById('confirm-password-container');
        const confirmUsernameContainer = document.getElementById('username-container');
        const confirmPasswordInput = document.getElementById('auth-confirm-password');

        if (!confirmPasswordContainer || !confirmUsernameContainer || !confirmPasswordInput) {
            return;
        }
        
        if (window.authMode === 'register') {
            confirmPasswordContainer.classList.remove('hidden');
            confirmUsernameContainer.classList.remove('hidden');
            confirmPasswordInput.required = true;
        } else {
            confirmPasswordContainer.classList.add('hidden');
            confirmUsernameContainer.classList.add('hidden');
            confirmPasswordInput.removeAttribute('required');
        }
    }

    // Toggles external links/buttons visibility
    function toggleExternalLinks() {
        const signInWith42Button = document.getElementById('oauth-submit');
        const registerLink = document.querySelector('button[data-action="register"]');
        const signinLink = document.querySelector('button[data-action="signin"]');

        if (!signInWith42Button || !registerLink || !signinLink) {
            return;
        }
        
        if (window.authMode === 'register') {
            registerLink.classList.add('hidden');
            signinLink.classList.remove('hidden');
            signInWith42Button.classList.add('hidden');
        } else {
            registerLink.classList.remove('hidden');
            signinLink.classList.add('hidden');
            signInWith42Button.classList.remove('hidden');
        }
    }