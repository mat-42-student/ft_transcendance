export function cleanErrorMessage() {
    const loginErrorContainer = document.getElementById('auth-error');
    loginErrorContainer.textContent = "";
    loginErrorContainer.classList.add('hidden');
}