import { state, selectVisibleHeader } from '../main.js';
import { initDynamicCard, closeDynamicCard } from '../components/dynamic_card.js';
import { WebGame } from './WebGame.js';

export class Mmaking
{
    constructor()
    {
		this.invited_by = {};
		this.guests = {};
		// Store bound functions
		this.boundEventListenersFriend = {};
		this.boundEventListenersClient = {};
		for (let [key, value] of state.socialApp.friendList)
		{
			const keyNumber = Number(key);
			if (keyNumber != NaN)
			{
				this.invited_by[keyNumber] = false;
				this.guests[keyNumber] = false;
				this.buildEventsbtnInvite(keyNumber);

			}
		}

		this.buildEvenbtnClient();
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
		this.btnsearchRandomisActive = false;
		this.btnSearchTournamentActive = false;
		this.bracket = false;
    }

	remove_friend(friendId)
	{
		Reflect.deleteProperty(this.invited_by, friendId);
		Reflect.deleteProperty(this.guests, friendId);
	}

	async update_friendList()
	{

		for (let [key, value] of state.socialApp.friendList)
			{
				const keyNumber = Number(key);
				if (keyNumber != NaN)
				{
					if (!this.invited_by[keyNumber] && !this.guests[keyNumber])
					{
						this.invited_by[keyNumber] = false;
						this.guests[keyNumber] = false;
						this.buildEventsbtnInvite(keyNumber);
					}
				}
			}
	}

	async buildEventsbtnInvite(keyNumber)
	{
		const btnmatch = document.querySelector(`.btn-match-${keyNumber}`);

		if (!this.boundEventListenersFriend[keyNumber]) {
			this.boundEventListenersFriend[keyNumber] = {
				btnInviteActive: this.btnInviteActive.bind(this, keyNumber),
				btnInviteDesactive: this.btnInviteDesactive.bind(this, keyNumber),
			};
		}
		btnmatch.addEventListener('click', this.boundEventListenersFriend[keyNumber].btnInviteDesactive);
	}

	buildEvenbtnClient()
	{
		this.boundEventListenersClient = {
			btnsearchRandomGame: this.btnsearchRandomGame.bind(this),
			eventSearchTournament: this.eventSearchTournament.bind(this)
		  };

	}

	sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	  }

	async renderMatchmaking()
	{
		if (this.cancel == true)
			this.cancelState();
		await this.renderHost();
		await this.renderGuest();
		await this.renderRandom();
		await this.renderTournament();
		await this.renderLaunchGame();
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
					document.getElementById('player-name').textContent = state.client.userName;
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
			if (this.salonHost == false && (this.salonInvite == false && this.salonLoad == false && this.SearchRandomGame == false))
				closeDynamicCard();
			if (this.salonLoad == true)
				await initDynamicCard('load');
			else if(this.salonInvite == true && value == true)
				await initDynamicCard('salonGuest');

			const btnHost = document.querySelector(`.btn-match-${key}`);
			const btnMatchPicture = document.getElementById(`btn-match-picture-${key}`);
			const friend = state.socialApp.friendList.get(Number(key));


			// Ensure the correct key is used
			const keyNumber = Number(key);

			// Bind functions with the key parameter and store them
			if (!this.boundEventListenersFriend[keyNumber]) {
				this.boundEventListenersFriend[keyNumber] = {
					btnInviteActive: this.btnInviteActive.bind(this, keyNumber),
					btnInviteDesactive: this.btnInviteDesactive.bind(this, keyNumber),
				};
			}

			// if you have refuse or accept the invtiation you come here
			if((value == false && btnMatchPicture && btnHost) || (value == true && this.salonInvite == true))
			{
				btnMatchPicture.src = "/ressources/vs.png";
				btnHost.removeEventListener('click', this.boundEventListenersFriend[keyNumber].btnInviteActive);
				btnHost.addEventListener('click', this.boundEventListenersFriend[keyNumber].btnInviteDesactive);

				if (value == true)
				{
					const btncancelGame = document.getElementById('cancel-button');

					document.getElementById('player-name').textContent = state.client.userName;
					this.setFriendwithoutLoader(friend.username, `../../../media/${friend.avatar}`);
					btncancelGame.addEventListener('click', (event) => this.cancelGame(event, keyNumber, 'invite'));

				}
			}
			// If you haven't response to invitation
			else if(value == null && btnHost && btnMatchPicture)
			{
				btnMatchPicture.src = "/ressources/vs_active.png";
				btnHost.removeEventListener('click', this.boundEventListenersFriend[keyNumber].btnInviteDesactive);
				btnHost.addEventListener('click', this.boundEventListenersFriend[keyNumber].btnInviteActive);
			}
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

		if (friendId != state.client.userId)
		{
			this.guests[friendId] = false;
			this.invited_by[friendId] = false;
		}

		this.cancelState();
		await this.sendMsg(data);
		await this.renderMatchmaking();
	}

	cancelState()
	{
		this.salonInvite = false;
		this.salonRandom = false;
		this.salonTournament = false;
		this.bracket = false;
		this.salonLoad = false;
		this.type_game = null;
		this.SearchRandomGame = false;
		this.game = false;
		this.gameId = null;
		this.salonHost = false;

		const btnTournament = document.getElementsByClassName('btn-tournament');
		const btnRandom = document.getElementById('versus');

		btnTournament[0].addEventListener('click', this.boundEventListenersClient.eventSearchTournament);
		btnRandom.addEventListener('click', this.boundEventListenersClient.btnsearchRandomGame);

		this.cancel = false
	} 

	async btnInviteDesactive(key)
	{

		const data =
		{
			'type_game': {
				'invite': {
					'guest_id': key
				}
			}
		};

		this.guests[key] = null;
		this.invited_by[key] = false;
		this.host = true;

		await this.sendMsg(data);
		await this.renderMatchmaking();
	}

	async btnInviteActive(key)
	{
		const friendId = key;
		const btnInviteAccept = document.getElementsByClassName('btn-accepter');
		const btnInviteRefuse = document.getElementsByClassName('btn-refuser');

		await initDynamicCard('vs_active');

		btnInviteAccept[0].addEventListener('click', (event) => this.btnInviteAccept(event, friendId));
		btnInviteRefuse[0].addEventListener('click', (event) => this.btnInviteRefuse(event, friendId));
	}

	async btnInviteAccept(event, friendId)
	{
		// const friendId = event.currentTarget.dataset.friendId;

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
		this.salonInvite = false;
		this.salonLoad = true;

		await this.sendMsg(data);
		await this.renderMatchmaking();
	}

	async btnInviteRefuse(event, friendId)
	{
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

	async renderLaunchGame()
	{
		const btnTournament = document.getElementsByClassName('btn-tournament');
		const btnRandom = document.getElementById('versus');

		if (this.bracket == true)
		{
			await this.bracketTournament();
			await this.sleep(5000);
			this.bracket = false;
			closeDynamicCard();
		}
		if (this.game == true)
			{
				closeDynamicCard();
				if (this.gameId != null) {
					if (state.gameApp != null)
						state.gameApp.close(true);
					state.gameApp = new WebGame();
					state.gameApp.launchGameSocket(this.gameId);
					selectVisibleHeader(true);
					this.game = false;
					btnTournament[0].removeEventListener('click', this.boundEventListenersClient.eventSearchTournament);
					btnRandom.removeEventListener('click', this.boundEventListenersClient.btnSearchRandomGame);
				}
			}
	}


	async renderRandom()
	{
		const btnRandom = document.getElementById('versus');

		if (this.SearchRandomGame == true)
		{
			await initDynamicCard('versus');
			document.getElementById('player-name').textContent = state.client.userName;
            document.getElementById("cancel-button").addEventListener("click", (event)=> this.cancelGame(event, state.client.userId, '1vs1R'));
		}
		else if (this.btnsearchRandomisActive == false)
		{
			btnRandom.addEventListener('click', this.boundEventListenersClient.btnsearchRandomGame);
			this.btnsearchRandomisActive = true;
		}

	}

	async btnsearchRandomGame(event=null)
	{
		const data = {
			'status': "online",
			'type_game': "1vs1R"
		};
		await this.sendMsg(data)

		const btnTournament = document.getElementsByClassName('btn-tournament');
		const btnRandom = document.getElementById('versus');

		btnTournament[0].removeEventListener('click', this.boundEventListenersClient.eventSearchTournament);
		btnRandom.removeEventListener('click', this.boundEventListenersClient.btnsearchRandomGame);
		this.SearchRandomGame = true;

		await this.renderMatchmaking();
	}


	async renderTournament()
	{
		const btnTournament = document.getElementsByClassName('btn-tournament');

		if (this.btnSearchTournamentActive == false)
		{
			btnTournament[0].addEventListener('click', this.boundEventListenersClient.eventSearchTournament);
			this.btnSearchTournamentActive = true;
		}
		else if (this.salonTournament == true)
		{
			await initDynamicCard('versus');
            document.getElementById("cancel-button").addEventListener("click", (event)=> this.cancelGame(event, state.client.userId, 'tournament'));

		}
		else if (!this.salonTournament && !this.salonHost && !this.salonInvite && !this.salonLoad && !this.SearchRandomGame)
		{
			closeDynamicCard();
		}
	}

	async bracketTournament()
	{
		closeDynamicCard();
		await initDynamicCard('tournament');
		const bracketContainer = document.getElementById('tournamentBracket');

		for (const [key, value] of Object.entries(this.opponents))
		{
			let firstPlayer = false;
			const matchElement = document.createElement('div');
			const teamContainer = document.createElement('div');
			matchElement.classList.add('match');

			for (const [id, player] of Object.entries(value))
			{
				if (firstPlayer == false)
				{
					const team1Element = document.createElement('div');
					team1Element.classList.add('team-name');
					team1Element.textContent = player.username;

					const team1Score = document.createElement('span');
					team1Score.classList.add('score');
					team1Score.textContent = player.score1 !== undefined ? player.score1 : '-';

					teamContainer.appendChild(team1Element);
					team1Element.appendChild(team1Score);


					const vsElement = document.createElement('div');
					vsElement.classList.add('vs');
					vsElement.textContent = 'vs';

					teamContainer.appendChild(vsElement);
					firstPlayer = true

				}
				else
				{
					const team2Element = document.createElement('div');
					team2Element.classList.add('team-name');
					team2Element.textContent = player.username;

					const team2Score = document.createElement('span');
					team2Score.classList.add('score');
					team2Score.textContent = player.score2 !== undefined ? player.score2 : '-';

					teamContainer.appendChild(team2Element);
					team2Element.appendChild(team2Score);

				}
			}
			teamContainer.classList.add('team');
			matchElement.appendChild(teamContainer);
			bracketContainer.appendChild(matchElement);

		}
	}


	async eventSearchTournament(event=null)
	{
		const data = {
			'status': "online",
			'type_game': "tournament"
		};

		await this.sendMsg(data);

		const btnTournament = document.getElementsByClassName('btn-tournament');
		const btnRandom = document.getElementById('versus');

		btnTournament[0].removeEventListener('click', this.boundEventListenersClient.eventSearchTournament);
		btnRandom.removeEventListener('click', this.boundEventListenersClient.btnsearchRandomGame);
		this.salonTournament = true;

		await this.renderMatchmaking();
	}

    async sendMsg(message)
	{

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

	async socketGameError() {
		const data = {
			'GameSocket': false,
			'gameId': this.gameId
		};

		this.cancelState();
		this.sendMsg(data);

	}

	async socketGameGood()
	{
		const data = {
			'GameSocket': true,
			'gameId': this.gameId
		};
		this.cancelState();
		this.sendMsg(data);

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

			if (this.gameId == null)
			{
				this.cancelState()
			}

			if (data.body.tournament == true)
			{
				this.bracket = true;
				this.salonTournament = false;
			}
			if (data.body.opponents)
			{
				this.opponents = data.body.opponents;
			}

        }
		else if (data.body.cancel == true)
		{
			if (data.body.invite)
			{
				const invite = data.body.invite;
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
			else if (data.body.tournament)
			{
				this.btnSearchTournamentActive = false;
				this.btnsearchRandomisActive = false;
				this.cancel = true
			}
			else
				this.cancel = true;
		}
		// Routing to communication mode Invite
        else if (data.body.invite)
        {
			const invite = data.body.invite;
            if (invite.host_id)
			{
				if (invite.accept == true)
				{
					this.invited_by[invite.host_id] = true;
					this.salonLoad = false;
					this.salonInvite = true;
				}
				else
				{
					this.invited_by[invite.host_id] = null;

				}
				this.salonLoad = false;

			}
			else if (invite.guest_id)
			{
				if (invite.accept == true && this.guests[invite.guest_id] == null)
				{
					this.guests[invite.guest_id] = true;
					this.salonHost = true;

				}
				else if (invite.accept == false && this.guests[invite.guest_id] == null)
				{
					this.guests[invite.guest_id] = false;
				}
			}

        }
		await this.renderMatchmaking();

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
}
