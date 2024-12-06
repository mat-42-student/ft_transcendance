import { setupNavigation, navigateTo } from './nav.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initial setup
    setupNavigation();

    // Load initial view
    const initialHash = window.location.hash || '#home';
    navigateTo(initialHash);

    // Event listeners for header buttons
    document.querySelector('.btn-home').addEventListener('click', () => navigateTo('#home'));
    document.querySelector('.btn-profile').addEventListener('click', () => navigateTo('#profile'));
});