import global from 'global';


	document.querySelectorAll('a.nav_url').forEach((link) => {
		link.addEventListener('click', function(event) {
			event.preventDefault(); // Facultatif
			console.log('Lien cliqué :', this.href);
			navigateTo(event.target.href); // Appelle la fonction de navigation
		});
	});


let routes = {
	//FIXME this probably shouldn't load index.html recursively... also why is this a separate route than /home
	'/page/index.html': {file: 'index.html', script: null},
	// '/page/home': {file: null, script: null}, //TODO run CPU game directly?
	'/page/matchmaking': {file: 'matchmaking.html', script: null},
	'/page/chat': {file: 'chat.html', script: null},
	'/page/profile': {file: 'profile.html', script: null},
	'/page/login': {file: 'login.html' , script: null},
	'/page/playing': {file: 'playing.html', script: null}
}

function router() {
	const path = window.location.pathname;
	const content = routes[path];

	//FIXME this can probably cause engine.loading to be stuck on
	if (path !== '/page/playing' && global.gameCancelFunction != null) {
		global.gameCancelFunction();
	}

	if (content) {
		console.log('router.js : router() : changing page.', '\n',
			'Browser URL is:', path, '\n',
			'Injected page is:', content.file, '\n',
			'Injected script is:', content.script
		);
		global.inject_code_into_markup(content.file, 'section', content.script);
	} else {
		//TODO this should probably be handled with a 404 page.
		console.warn('router.js : router() : changing page, but the URL is unknown.');
	}
}

export function navigateTo(url){
	window.history.pushState(null, null, url);
	router();
}

window.addEventListener('popstate', router);

window.addEventListener('load', (e)=>
{
	router();
})