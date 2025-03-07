import { state } from './main.js';
import { initDynamicCard, closeDynamicCard } from './components/dynamic_card.js';
import { WebGame } from './WebGame.js';

export class Mmaking
{
    constructor()
    {
		this.invited_by = {};
		this.guests = {};
		// Store bound functions
		this.boundEventListeners = {};
		for (let [key, value] of state.socialApp.friendList)
		{
			const keyNumber = Number(key);
			if (keyNumber != NaN)
			{
				console.log(keyNumber)
				this.invited_by[keyNumber] = false;
				this.guests[keyNumber] = false;
				this.buildEventsbtnInvite(keyNumber);

			}
		}
		this.host = false;
		this.opponents = {};
		this.SearchRandomGame = false;
		this.cancel = false;
		this.salonInvite = false;
		this.salonHost = false;
		this.salonLoad = false
		this.salonRandom = false;
		this.type_game = null;
		this.game = null;
		this.gameId = null;
    }

	async buildEventsbtnInvite(keyNumber)
	{
		const btnmatch = document.querySelector(`.btn-match-${keyNumber}`);

		if (!this.boundEventListeners[keyNumber]) {
			this.boundEventListeners[keyNumber] = {
				btnInviteActive: this.btnInviteActive.bind(this, keyNumber),
				btnInviteDesactive: this.btnInviteDesactive.bind(this, keyNumber),
			};
		}
		btnmatch.addEventListener('click', this.boundEventListeners[keyNumber].btnInviteDesactive);
	}

	async renderMatchmaking()
	{
		await this.renderHost();
		await this.renderGuest();
		await this.renderRandom();
	}

	async renderHost()
	{
		
		for (const [key, value] of Object.entries(this.guests))
		{
			const friend = state.socialApp.friendList.get(Number(key));
			const cardFriend = document.getElementsByClassName(`friend-item-${key}`);
			
			let keyNumber = Number(key);
			// If you guest has response yes, no or you are in salon
			if (friend && (value == true || value == false || this.salonHost))
			{
				this.cardFriendReset(cardFriend[0]);
				if (value == true)
				{
					await initDynamicCard('salonHost');
					this.setFriendwithoutLoader(friend.username, `../../../media/${friend.avatar}`)

					const btnstartgame = document.getElementById('start-game');
					const btncancelGame = document.getElementById('cancel-button');

					btnstartgame.addEventListener('click', (event) => this.startGame(event, keyNumber));
					btncancelGame.addEventListener('click', (event) => this.cancelGame(event, keyNumber, 'invite'));

				}
				
			}
			// If you invite the guest
			else if (friend && value == null)
			{
				this.cardFriendInvited(cardFriend[0])
			}

			// If you are in game
			if (this.game == true)
			{
				closeDynamicCard();
				this.cardFriendReset(cardFriend);
				state.gameApp.launchGameSocket(this.gameId);
				this.game = false;
			}
		}
	}

	cardFriendInvited(friendCard)
	{
		friendCard.style.backgroundColor = 'blue';
	}

	cardFriendReset(friendCard)
	{
		friendCard.style.backgroundColor = "#f8f9fa";
	}


	async renderGuest()
	{
		for (const [key, value] of Object.entries(this.invited_by))
		{
			if (this.salonHost == false && this.salonInvite == false)
				closeDynamicCard();
			else if (this.salonLoad == true)
				await initDynamicCard('salonLoad');

			const btnHost = document.querySelector(`.btn-match-${key}`);
			const btnMatchPicture = document.getElementById(`btn-match-picture-${key}`);
			const friend = state.socialApp.friendList.get(Number(key));


			// Ensure the correct key is used
			const keyNumber = Number(key);

			// Bind functions with the key parameter and store them
			if (!this.boundEventListeners[keyNumber]) {
				this.boundEventListeners[keyNumber] = {
					btnInviteActive: this.btnInviteActive.bind(this, keyNumber),
					btnInviteDesactive: this.btnInviteDesactive.bind(this, keyNumber),
				};
			}

			// if you have refuse or accept the invtiation you come here
			if(value == false || (value == true && this.salonInvite == true))
			{
				btnMatchPicture.src = "/ressources/vs.png";
				btnHost.removeEventListener('click', this.boundEventListeners[keyNumber].btnInviteActive);
				btnHost.addEventListener('click', this.boundEventListeners[keyNumber].btnInviteDesactive);

				if (value == true)
				{
					const btncancelGame = document.getElementById('cancel-button');

					this.setFriendwithLoader(friend.username, `../../../media/${friend.avatar}`)
					btncancelGame.addEventListener('click', (event) => this.cancelGame(event, keyNumber, 'invite'));

				}
			}
			// If you haven't response to invitation
			else
			{
				btnMatchPicture.src = "/ressources/vs_active.png";
				btnHost.removeEventListener('click', this.boundEventListeners[keyNumber].btnInviteDesactive);
				btnHost.addEventListener('click', this.boundEventListeners[keyNumber].btnInviteActive);
			}
			
			// if you are in game
			if (this.game == true)
			{
				closeDynamicCard();
				
				state.gameApp.launchGameSocket(this.gameId);
				this.game = false;
			}
		}
	}

	async renderCancel()
	{
		if (this.cancel == true)
		{
			closeDynamicCard();
		}
	}

	async startGame(friendId)
	{
		const data = {
			'type_game': {
				'invite':{
					'guest_id': friendId,
					'accept': true,
					'startgame': true 
				}
			}
		};

		await this.sendMsg(data);

		this.salonHost = false;
		this.guests[friendId] = false;
		this.renderMatchmaking();

	}

	async cancelGame(event, friendId, type_game)
	{
		const data = {
			'type_game': type_game,
			'cancel' : true
		};

		console.log(`cancelGame = ${friendId}`);
		this.guests[friendId] = false;
		this.invited_by[friendId] = false;
		this.salonInvite = false;
		this.salonRandom = false;
		this.salonLoad = false;
		this.type_game = null;
		this.SearchRandomGame = false;
		this.game = false;
		this.salonHost = false;

		await this.sendMsg(data);
		await this.renderMatchmaking();
	}

	async btnInviteDesactive(key)
	{
		// const friendId = event.currentTarget.dataset.friendId;


		const data =
		{
			'type_game': {
				'invite': {
					'guest_id': key
				}
			}
		};

		console.log("btninviteDesactive " + key);
		this.guests[key] = null;
		this.invited_by[key] = false;
		this.host = true;

		await this.sendMsg(data);
		await this.renderMatchmaking();
	}

	async btnInviteActive(key)
	{
		const friendId = key;
		console.log(key);
		const btnInviteAccept = document.getElementsByClassName('btn-accepter');
		const btnInviteRefuse = document.getElementsByClassName('btn-refuser');

		await initDynamicCard('vs_active');
		
		btnInviteAccept[0].addEventListener('click', (event) => this.btnInviteAccept(event, friendId));
		btnInviteRefuse[0].addEventListener('click', (event) => this.btnInviteRefuse(event, friendId));
	}

	async btnInviteAccept(event, friendId)
	{
		// const friendId = event.currentTarget.dataset.friendId;

		console.log(`friendId -> ${friendId}`);
		const data = {
			'type_game': {
				'invite':{
					'host_id': friendId,
					'accept': true
				},
			}
		};

		this.guests[friendId] = false;
		this.invited_by[friendId] = false;
		this.host = false;
		this.salonInvite = true;
		this.salonLoad = true;

		await this.sendMsg(data);
		await this.renderMatchmaking();
	}

	async btnInviteRefuse(event, friendId)
	{
		console.log(friendId);
		const data = {
			'type_game': {
				'invite':{
					'host_id': friendId,
					'accept': false
				}
			}
		};

		this.guests[friendId] = false;
		this.invited_by[friendId] = false;
		this.salonInvite = false;

		await this.sendMsg(data);
		await this.renderMatchmaking();
	}


	async renderRandom()
	{
		if (this.SearchRandomGame == true)
		{
			await initDynamicCard('versus');
            document.getElementById("cancel-button").addEventListener("click", (event)=> this.cancelGame(event, state.client.userId, '1vs1R'));
		}
		if (this.game == true)
		{
			state.gameApp.launchGameSocket(this.gameId);
		}

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
			this.SearchRandomGame = true;
			await this.renderMatchmaking();

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

    async incomingMsg(data)
    {
        if (data.body.status == 'ingame')
        { 
			this.game = true;
			this.gameId =  data.body.id_game;
			this.salonInvite = false;
			this.salonLoad = false;
			this.SearchRandomGame = false;
        }
		else if (data.body.cancel == true)
		{
			if (data.body.type_game.invite)
			{
				const invite = data.body.type_game.invite;
				if (invite.host_id)
				{
					this.invited_by[invite.host_id] = false;
					this.salonLoad = false;
					this.salonInvite = false;
				}
				else if (invite.guest_id)
				{
					this.guests[invite.guest_id] = false;
					this.salonHost = false;

				}
			}
		}
		// Routing to communication mode Invite
        else if (data.body.type_game.invite)
        {
			const invite = data.body.type_game.invite;
            if (invite.host_id)
			{
				if (invite.accept == true)
				{
					this.invited_by[invite.host_id] = true;

				}
				else
				{
					this.invited_by[invite.host_id] = null;

				}
				this.salonLoad = false;

				console.log('invited_by: ' + invite.host_id);
			}
			else if (invite.guest_id)
			{
				if (invite.accept == true)
				{
					this.guests[invite.guest_id] = true;
					this.salonHost = true;

				}
				else if (invite.accept == false)
				{
					this.guests[invite.guest_id] = false;
				}
			}

        }
		await this.renderMatchmaking();

    }

	desableOverlay()
	{
		// Style of my card. My card don't block website
		const overlay = document.getElementsByClassName('overlay');
		const dynamicContainer = document.getElementById('dynamic-card-container');

		// style of dynamic card container
		dynamicContainer.style.zIndex = 0;
		dynamicContainer.style.width = "auto";
		dynamicContainer.style.height = "auto";
		dynamicContainer.style.top = "50%";
		dynamicContainer.style.left = "50%";


		// style overlay
		overlay[0].classList.add('hidden');
	}

	waitReponseofGuest(target)
	{
		//target.style.display = 'none';
		const frienditem = target.closest('.friend-item');
		frienditem.style.backgroundColor = 'blue';
	}

    setOpponent(name, photo, type_game) {
        document.getElementById("opponent-info").style.display = "block";
        document.getElementById("opponent-name").textContent = name;
        document.getElementById("opponent-photo").src = photo;
		try
		{
			if (type_game == '1vs1R')
			{
				random = document.getElementById("random-loader");

				// random.style.display = "none";
				document.getElementById("status").textContent = "Adversaire trouvé !";
				document.getElementById("loader").style.display = "none";
				document.getElementById("waiting-text").textContent = "Préparez-vous à jouer !";
			}
			else if (type_game == 'invite')
			{
				btnStartGameInvite = document.getElementById('start-game');
				btnStartGameInvite.style.display = 'none';
			}
		}
		catch (error)
		{
			console.log(error);
		}
        document.getElementById("cancel-button").style.display = "none";
    }

	setOpponentInvite(name, photo) {
        document.getElementById("opponent-info").style.display = "block";
        document.getElementById("opponent-name").textContent = name;
        document.getElementById("opponent-photo").src = photo;
        document.getElementById("cancel-button").style.display = "none";
    }

    setFriendwithoutLoader(name, picture)
    {
        document.getElementById("opponent-info").style.display = "block";
        document.getElementById("opponent-name").textContent = name;
        document.getElementById("opponent-photo").src = picture;
    }

    setFriendwithLoader(name, picture)
    {
        document.getElementById("opponent-info").style.display = "block";
        document.getElementById("opponent-name").textContent = name;
        document.getElementById("opponent-photo").src = picture;
		document.getElementById("random-loader").style.display = "none";
    }

    createCard() {
        const card = document.createElement("div");
        card.classList.add("invitation");

        const title = document.createElement("h2");
        title.textContent = "Invitation";

        const message = document.createElement("p");
        message.textContent = "Souhaitez-vous accepter cette demande ?";

        const acceptButton = document.createElement("button");
        acceptButton.classList.add("btn-invitation", "btn-accepter");
        acceptButton.textContent = "✅";

        const refuseButton = document.createElement("button");
        refuseButton.classList.add("btn-invitation", "btn-refuser");
        refuseButton.textContent = "❌";

        card.appendChild(title);
        card.appendChild(message);
        card.appendChild(acceptButton);
        card.appendChild(refuseButton);

        return card;
    }
}