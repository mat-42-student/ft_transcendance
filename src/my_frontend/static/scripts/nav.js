const routes = {
    '#home': './partials/home.html',
    '#profile': './partials/profile.html',
    // Add more routes as needed
};

export function setupNavigation() {
    window.addEventListener('popstate', () => {
        navigateTo(window.location.hash);
    });
}

export async function navigateTo(hash) {
    const route = routes[hash];
    if (!route) return;

    try {
        const response = await fetch(route);
        const html = await response.text();
        document.querySelector('.main-content').innerHTML = html;
    } catch (error) {
        console.error('Error loading page:', error);
    }

    // Update the URL without reloading the page
    window.history.pushState({}, '', hash);
}