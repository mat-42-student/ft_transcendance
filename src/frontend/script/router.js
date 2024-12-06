import global from 'global';


	document.querySelectorAll('a.nav_url').forEach((link) => {
		link.addEventListener('click', function(event) {
			event.preventDefault(); // Facultatif
			console.log('Lien cliqué :', this.href);
			navigateTo(event.target.href); // Appelle la fonction de navigation
		});
	});


let routes = {
	//FIXME this probably shouldn't load index.html recursively...
	'/index.html': {file: 'index.html', script: null},
	'/home':        {file: 'matchmaking.html', script: ['./script/matchmaking.js','wsgame.js']},
	'/matchmaking': {file: 'matchmaking.html', script: ['./script/matchmaking.js','wsgame.js']},
	'/chat': {file: 'chat.html', script: null},
	'/profile': {file: 'profile.html', script: null},
	'/login': {file: 'login.html' , script: null},
}

function router() {
	const path = window.location.pathname;
	const content = routes[path];

	if (content) {
		console.log('router.js : router() : changing page.', '\n',
			'Browser URL is:', path, '\n',
			'Injected page is:', content.file, '\n',
			'Injected script is:', content.script
		);
		global.inject_code_into_markup(content.file, 'section', content.script);
	} else {
		console.warn('router.js : router() : changing page, but the URL is unknown.');
	}
}

function navigateTo(url){
	window.history.pushState(null, null, url);
	router();
}

window.addEventListener('popstate', router);

window.addEventListener('load', (e)=>
{
	router();
})