// Header. always present
inject_code_into_markup('menu.html', 'nav', null);


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
	// if (window.location.hash === currentPath) {
	// 	return;  // Same page already, do nothing
	// }

	currentPath = window.location.hash;
	if (currentPath.length >= 1 && currentPath[0] === '#') {
		currentPath = currentPath.substring(1);
	}
	inject_code_into_markup(currentPath, 'main', null)

	if (cancelCurrentGameFunction != null) {
		cancelCurrentGameFunction();
	}
}
