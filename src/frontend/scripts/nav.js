import { state } from "./main.js";
import { isAuthenticated } from './api/auth.js';
import { setupHomePage, setupProfilePage } from "./pages.js";
import { closeDynamicCard, initDynamicCard } from './components/dynamic_card.js';
import { updateAuthForm } from "./components/auth_form.js";

class Navigator {
    constructor() {
        this.mainContent = document.querySelector('.main-content');
        this.cardContainer = document.getElementById('dynamic-card-container');
        window.addEventListener('popstate', () => this.handleHashChange());
    }

    async handleHashChange() {
        const hash = window.location.hash;
        const isAuth = await isAuthenticated();

        const pageMap = {
            '#home': () => this.goToPage('home'),
            '#profile': () => this.goToPage('profile')
        };

        // Gestion des cas d'authentification
        if (hash === '#register' || hash === '#signin') {
            if (isAuth) return pageMap['#profile'];
            if (this.cardContainer.classList.contains('hidden')) initDynamicCard('auth');
            return updateAuthForm(hash);
        }

        // Fermer la carte dynamique si on change de page
        if (!this.cardContainer.classList.contains('hidden')) {
            closeDynamicCard();
        }

        return (pageMap[hash] || pageMap['#home'])();
    }

    async goToPage(page, userId = null) {
        if (!this.mainContent) return;

        const pageFiles = {
            home: { url: './partials/home.html', setup: setupHomePage },
            profile: { url: './partials/profile.html', setup: setupProfilePage }
        };

        if (!pageFiles[page]) return console.error('Page not found:', page);

        if (page === 'profile' && !(await isAuthenticated())) {
            window.history.replaceState({}, '', `#signin`);
            return initDynamicCard('auth');
        }

        try {
            const response = await fetch(pageFiles[page].url);
            const html = await response.text();
            this.mainContent.innerHTML = html;

            requestAnimationFrame(() => {
                if (page === 'profile') state.client.loadUserProfile(userId);
            });

            pageFiles[page].setup();
            window.history.replaceState({}, '', `#${page}`);
        } catch (error) {
            console.error('Error loading page:', error);
        }
    }
}

// Exporter une instance unique
export const navigator = new Navigator();