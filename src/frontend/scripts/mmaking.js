import { state } from './main.js';

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

	Build_Salon()
	{
		 
	}
}