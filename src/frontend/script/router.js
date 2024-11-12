import global from 'global';


// Header. always present
global.inject_code_into_markup('menu.html', 'nav', null);


// if we can't detect when the address changes, we're Mega Screwed™
if (!("onhashchange" in window)) {
	const err = 'big oopsie, it seems this browser is unsupported';
	alert(err);
	throw Error(err);
}


let currentPath = undefined;

window.onhashchange = onChangePage;
onChangePage();

function onChangePage(){
	// REVIEW delete or keep this?
	// if (window.location.hash === currentPath) {
	// 	return;  // Same page already, do nothing
	// }

	currentPath = window.location.hash;
	if (currentPath.length >= 1 && currentPath[0] === '#') {
		currentPath = currentPath.substring(1);
	}
	global.inject_code_into_markup(currentPath, 'main', null)

	if (global.gameCancelFunction != null) {
		global.gameCancelFunction();
	}
}
