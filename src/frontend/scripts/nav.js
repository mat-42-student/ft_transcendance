import { state } from './main.js';
import { initHomePage, initProfilePage } from "./pages.js";
import { closeDynamicCard, initDynamicCard } from './components/dynamic_card.js';
import { ft_fetch } from './main.js';

class Navigator {
    constructor() {
        this.mainContent = document.querySelector('.main-content');
        this.cardContainer = document.getElementById('dynamic-card-container');
        window.addEventListener('popstate', () => this.handleHashChange());
    }

    async goToPage(page, userId = null, dontChangeHistory = false) {
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
            return initDynamicCard('auth');
        }
    
        const hash = page === 'profile'
            ? `#profile/${userId || state.client.userId}`
            : `#${page}`;
    
        try {
            const response = await ft_fetch(pageFiles[page].url);
            const html = await response.text();
            this.mainContent.innerHTML = html;
            const hash = userId ? `#${page}/${userId}` : `#${page}`;

            if (dontChangeHistory != true) {
                window.history.pushState({}, '', hash);
            }

            requestAnimationFrame(() => {
                pageFiles[page].setup(userId);
            });
        } catch (error) {
            console.error('Error loading page:', error);
        }
    }

    async handleHashChange() {
        // Don't leave #home while playing!
        if (state.gameApp != null) {
            state.gameApp.close();
        }

        const hash = window.location.hash;
        const isAuth = await state.client.isAuthenticated();
    
        if (!this.cardContainer.classList.contains('hidden'))
            closeDynamicCard();

		if(state.mmakingApp != null)
			await state.mmakingApp.cancelGame_with_pending_status();
    
        // Parsing du hash
        const hashMatch = hash.match(/^#(\w+)(?:\/(\d+))?$/);
        if (!hashMatch) return this.goToPage('home');
    
        const page = hashMatch[1];
        const userId = hashMatch[2];
    
        switch (page) {
            case 'home':
                return this.goToPage('home', null, true);
            case 'profile':
                return this.goToPage('profile', userId || null, true);
            default:
                return this.goToPage('home', null, true);
        }
    }
}

export const navigator = new Navigator();