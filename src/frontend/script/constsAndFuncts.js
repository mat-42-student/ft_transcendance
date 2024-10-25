const PADWIDTH = 100;
const RADIUS = 20;
const LEFT_PLAYER = 0;
const RIGHT_PLAYER = 1;
const SCORE_MAX = 10;
let field, lpad, rpad, ball_div, playing, raf, side, difficulty;
let ball_dx, ball_dy, ball_x, ball_y, winner, speed, keyStillCPUDown;
let pad = [], move = [], score = [], keyStillDown = [], nick = [], size = [];

/////////////////////////// Utils part ///////////////////////////

function generateRandomNick() {
    const adjectives = ["Shadow", "Steady", "Mighty", "Funny", "Hidden", "Normal"];
    const nouns = ["Ficus", "Pidgin", "Rock", "Spring", "Curtains", "Hobo"];

    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

    return randomAdj + randomNoun + Math.floor(Math.random() * 1000);
}

function randomInRange(a, b) {
    let range = Math.random() < 0.5 ? [-b, -a] : [a, b];
    return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
}

async function inject_code_into_markup(htmlfile, markup, script) {
    try {
        const response = await fetch(htmlfile);
        const content = await response.text();
        document.querySelector(markup).innerHTML = content;
    } catch (error) {
        console.error("Erreur lors du chargement du fichier :", error);
    }
    if (script)
        addScript(script);
}

function addScript(file) {
    const newScript = document.createElement('script');
    newScript.src = file;
    document.body.appendChild(newScript);
}