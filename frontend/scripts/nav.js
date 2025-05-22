import { state } from './main.js';
import { initHomePage, initProfilePage } from "./pages.js";
import { mainErrorMessage } from './utils.js';
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
            '': { url: './partials/home.html', setup: initHomePage },
            'profile': { url: './partials/profile.html', setup: initProfilePage },
            '404': { url: './partials/404.html', setup: null },
        };
    
        if (!pageFiles[page]) return mainErrorMessage(`Page not found: ${page}`);

        if (page === 'profile' && !(await state.client.isAuthenticated())) {
            return initDynamicCard('auth');
        }
    
        const hash = page === 'profile'
            ? `#profile/${userId || state.client.userId}`
            : `#${page}`;
    
        try {
            const response = await ft_fetch(pageFiles[page].url);
            // if (!response.ok)
            //     throw new Error(`Page partial not found: ${pageFiles[page].url}`);
            const html = await response.text();
            this.mainContent.innerHTML = html;
            const hash = userId ? `#${page}/${userId}` : `#${page}`;

            if (dontChangeHistory != true) {
                window.history.pushState({}, '', hash);
            }

            if (pageFiles[page].setup) {
                requestAnimationFrame(() => {
                    pageFiles[page].setup(userId);
                });
            }
        } catch (error) {
            mainErrorMessage(error);
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
			await state.mmakingApp.cancelGame_with_pending_or_ingame_status();
    

        if (window.location.hash == '')
            return this.goToPage('', null, true);

        // Parsing du hash
        const hashMatch = hash.match(/^#(\w+)(?:\/(\d+))?$/);
    
        let page;
        let userId;

        if (hashMatch) {
            page = hashMatch.length >= 2 ? hashMatch[1] : null;
            userId = hashMatch.length >= 3 ? hashMatch[2] : null;
        } else {
            page = '';
            userId = null;
        }
    
        switch (page) {
            case '':
                return this.goToPage('', null, true);
            case 'profile':
                return this.goToPage('profile', userId || null, true);
            default:
                return this.goToPage('404', null, true);
        }
    }
}

export const navigator = new Navigator();