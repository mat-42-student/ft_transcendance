import { state } from './main.js';
import { initHomePage, initProfilePage } from "./pages.js";
import { updateAuthForm } from "./components/auth_form.js";
import { closeDynamicCard, initDynamicCard } from './components/dynamic_card.js';

class Navigator {
    constructor() {
        this.mainContent = document.querySelector('.main-content');
        this.cardContainer = document.getElementById('dynamic-card-container');
        window.addEventListener('popstate', () => this.handleHashChange());
    }

    async goToPage(page, userId = null) {
        if (!this.mainContent) return;

        if (state && state.engine && state.engine.scene && state.engine.scene.pendingEndHide) {
            state.engine.scene.endHideResult();
        }

        const pageFiles = {
            home: { url: './partials/home.html', setup: initHomePage },
            profile: { url: './partials/profile.html', setup: initProfilePage }
        };

        if (!pageFiles[page]) return console.error('Page not found:', page);

        if (page === 'profile' && !(await state.client.isAuthenticated())) {
            window.history.replaceState({}, '', `#signin`);
            return initDynamicCard('auth');
        }

        try {
            const response = await fetch(pageFiles[page].url);
            const html = await response.text();
            this.mainContent.innerHTML = html;

            requestAnimationFrame(() => {
                pageFiles[page].setup(userId);
            });

            window.history.replaceState({}, '', `#${page}`);
        } catch (error) {
            console.error('Error loading page:', error);
        }
    }

    async handleHashChange() {
        const hash = window.location.hash;
        const isAuth = await state.client.isAuthenticated();

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
}

export const navigator = new Navigator();