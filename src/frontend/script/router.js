import global from 'global';


// Header. always present

	document.querySelectorAll('a.nav_url').forEach((link) => {
		link.addEventListener('click', function(event) {
			event.preventDefault(); // Facultatif
			console.log('Lien cliqué :', this.href);
			navigateTo(event.target.href); // Appelle la fonction de navigation
		});
	});


let routes = {
	'/index.html': {file: 'index.html', script: null},
	'/home': {file: 'matchmaking.html', scipt: ['./script/matchmaking.js','wsgame.js']},
	'/matchmaking': {file: 'matchmaking.html', script: ['./script/matchmaking.js','wsgame.js']},
	'/chat': {file: 'chat.html', script: null},
	'/profile': {file: 'profile.html', script: null},
	'/login': {file: 'login.html' , script: null},
}

function router() {
	const path = window.location.pathname;
	console.log(path);
	const content = routes[path];

	console.log(content);
	if (content)
		inject_code_into_markup(content.file, 'section', content.script);

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



