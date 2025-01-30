import { state } from './main.js';
import { initDynamicCard } from './components/dynamic_card.js';

export class Mmaking
{
	constructor(mainSocket)
	{

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
			this.sendMsg('back', data)
			await initDynamicCard('versus')
		});

	}

    sendMsg(dest, message) {

		const data = {
			'header': {  //Mandatory part
			'service': 'mmaking',
			'dest': 'back',
			'id': state.client.userId
			},
			'body': message
		};
	state.mainSocket.send(JSON.stringify(data));
	}

	incomingMsg(data)
	{

		if (data.body.status == 'ingame')
		{
			this.setOpponent('toto', '/ressouces/match.png')
		}
	}

	launch_game()
	{
		 
	}

	setOpponent(name, photo) {
		document.getElementById("opponent-name").textContent = name;
		document.getElementById("opponent-photo").src = photo;
		document.getElementById("opponent-info").style.display = "block";
		document.getElementById("status").textContent = "Adversaire trouvé !";
		document.getElementById("loader").style.display = "none";
		document.getElementById("waiting-text").textContent = "Préparez-vous à jouer !";
	}
}