import { state } from './main.js';
import { initDynamicCard, closeDynamicCard } from './components/dynamic_card.js';
import { Game } from './Game.js';

export class Mmaking
{
	constructor(mainSocket)
	{
		this.waited_page = null;
		this.gameSocket = null;
	}


	refresh_eventlisteners()
	{
		this.listening_button_match_Random();
	}

	listening_button_match_Random()
	{
		const randomBtn = document.getElementById('versus');
		if (!randomBtn)
			return ;
		randomBtn.addEventListener('click', async ()=>
		{
			const data = {
				'status': "online",
				'type_game': "1vs1R"
			};
			await this.sendMsg(data)
			this.waited_page = await initDynamicCard('versus')
			document.getElementById("cancel-button").addEventListener("click", this.cancel_game.bind(this));
		});

	}

    async sendMsg(message) {

		const data = {
			'header': {  //Mandatory part
			'service': 'mmaking',
			'dest': 'back',
			'id': state.client.userId
			},
			'body': message
		};
	await state.mainSocket.send(JSON.stringify(data));
	}

	incomingMsg(data)
	{

		if (data.body.status == 'ingame')
		{
			console.log(data);
			for (const [key, value] of Object.entries(data.body.opponents))
				this.setOpponent(value.username, '../../ressources/match.png')

			state.gameApp = new Game();
			state.gameApp.launchGameSocket();
		}
	}

	launch_game()
	{
		 
	}

	async cancel_game()
	{
		document.getElementById("status").textContent = "Recherche annulée";
		document.getElementById("loader").style.display = "none";
		document.getElementById("waiting-text").textContent = "Vous avez annulé la recherche.";
		document.getElementById("cancel-button").style.display = "none";

		const data = {
			'status': "pending",
			'type_game': "1vs1R",
			'cancel': true
		};


		this.sendMsg(data)
		
		closeDynamicCard();
	}

	setOpponent(name, photo) {
		document.getElementById("opponent-info").style.display = "block";
		document.getElementById("opponent-name").textContent = name;
		document.getElementById("opponent-photo").src = photo;
		document.getElementById("status").textContent = "Adversaire trouvé !";
		document.getElementById("loader").style.display = "none";
		document.getElementById("waiting-text").textContent = "Préparez-vous à jouer !";
		document.getElementById("cancel-button").style.display = "none";
	}
}