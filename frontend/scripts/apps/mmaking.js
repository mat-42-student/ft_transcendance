import { state, chooseHeader } from '../main.js';
import { initDynamicCard, closeDynamicCard } from '../components/dynamic_card.js';
import { WebGame } from './WebGame.js';
import { getAvatarPath } from '../utils.js';

export class Mmaking
{
    constructor()
    {
		this.invited_by = {};
		this.guests = {};
		// Store bound functions
		this.boundEventListenersFriend = {};
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

		document.getElementsByClassName('btn-tournament')[0]?.addEventListener('click', this.btnSearchTournament.bind(this));
		document.getElementById('versus')?.addEventListener('click', this.btnsearchRandomGame.bind(this));
		this.host = false;
		this.opponents = {};
		this.SearchRandomGame = false;
		this.cancel = false;
		this.salonInvite = false;
		this.salonHost = false;
		this.salonLoad = false
		this.salonRandom = false;
		this.salonTournament = false;
		this.type_game = null;
		this.game = null;
		this.gameId = null;
		this.bracket = false;
		this.winnerId_of_tournament = null;
		this.tournament = false
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
        if (!btnmatch)
            return

		if (!this.boundEventListenersFriend[keyNumber]) {
			this.boundEventListenersFriend[keyNumber] = {
				btnInviteActive: this.btnInviteActive.bind(this, keyNumber),
				btnInviteDesactive: this.btnInviteDesactive.bind(this, keyNumber),
			};
		}
		btnmatch.addEventListener('click', this.boundEventListenersFriend[keyNumber].btnInviteDesactive);
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

	async cancelGame_with_pending_or_ingame_status()
	{
		if (state.socialApp?.myStatus != 'pending' && state.socialApp?.myStatus != 'ingame' )
			return
		let type_game = null
		if (this.salonInvite == true || this.salonLoad == true)
			type_game = 'invite';
		else if (this.salonRandom == true)
		{
			type_game = '1vs1R';
		}
		else if (this.salonTournament == true)
		{
			type_game = 'tournament';
		}
		await this.cancelGame(null, state.client.userId, type_game);
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

					const player_picture = document.getElementById('player-photo');
                    const player_name = document.getElementById('player-name');
                    if (!player_name || !player_picture)
                        constinue;
                    else
                    {
                        player_picture .src = getAvatarPath(state.client.userAvatar);
                        player_name.textContent = state.client.userName;
                        this.setFriendwithoutLoader(friend.username, getAvatarPath(friend.avatar));

                        const btnstartgame = document.getElementById('start-game');
                        const btncancelGame = document.getElementById('cancel-button');
                        
                        if (btnstartgame)
                            btnstartgame.addEventListener('click', (event) => this.startGame(event, keyNumber));
                        if (btncancelGame)
                            btncancelGame.addEventListener('click', (event) => this.cancelGame(event, keyNumber, 'invite'));
                    }

				}

			}
			// If you invite the guest
			else if (friend && value == null)
			{
				this.cardFriendInvited(cardFriend[0])
			}
		}
	}



	async renderGuest()
	{
		for (const [key, value] of Object.entries(this.invited_by))
		{
			if (this.salonHost == false && (this.salonInvite == false && this.salonLoad == false && this.SearchRandomGame == false))
				closeDynamicCard();
			if (this.salonLoad == true)
			{
				await initDynamicCard('load');
                const close_card = document.getElementById('close-dynamic-card');
                if (close_card)
				    close_card.style.display = 'none';
			}
			else if(this.salonInvite == true && value == true)
			{
				await initDynamicCard('salonGuest');
                const close_card = document.getElementById('close-dynamic-card')
				    close_card.style.display = 'none';
			}

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
                    const player_picture = document.getElementById('player-photo');
                    const player_name = document.getElementById('player-name');
                    if (player_picture)
					    player_picture.src = getAvatarPath(state.client.userAvatar);
                    if (player_name)
					    player_name.textContent = state.client.userName;
					this.setFriendwithoutLoader(friend.username, getAvatarPath(friend.avatar));
                    if (btncancelGame)
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
		this.tournament = false;

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

        if (btnInviteAccept && btnInviteAccept[0])
		    btnInviteAccept[0].addEventListener('click', (event) => this.btnInviteAccept(event, friendId));
        if (btnInviteRefuse && btnInviteRefuse[0])
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

		if (this.bracket == true)
		{
			await this.bracketTournament();
			await this.sleep(2000);
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
				chooseHeader('loading');
				this.game = false;
			}
		}
	}


	async renderRandom()
	{
		if (this.SearchRandomGame == true)
		{
			await initDynamicCard('versus');

            const player_picture = document.getElementById('player-photo');
            const player_name = document.getElementById('player-name');
            const close_card = document.getElementById('close-dynamic-card');
            const cancelBtn = document.getElementById("cancel-button");
            if (player_picture)
			    player_picture.src = getAvatarPath(state.client.userAvatar);
            if (player_name)
			    player_name.textContent = state.client.userName;
            if (close_card)
			    close_card.style.display = 'none'
            if (cancelBtn)
                cancelBtn.addEventListener("click", (event)=> this.cancelGame(event, state.client.userId, '1vs1R'));
		}
	}

	async btnsearchRandomGame(event=null)
	{
		if (state.mainSocket == null) {
			initDynamicCard('auth');
			return;
		}
		if (state.socialApp.myStatus == 'online')
		{

			const data = {
				'status': "online",
				'type_game': "1vs1R"
			};
			await this.sendMsg(data)

			this.SearchRandomGame = true;

			await this.renderMatchmaking();
		}
	}


	async renderTournament()
	{
		if (this.SearchRandomGame == true)
		{
			await initDynamicCard('versus');

            const player_picture = document.getElementById('player-photo');
            const cancelBtn = document.getElementById("cancel-button");
            const close_card = document.getElementById('close-dynamic-card');

            if (player_picture)
			    player_picture.src = getAvatarPath(state.client.userAvatar);
            if (close_card)
			    close_card.style.display = 'none'
            if (cancelBtn)
                cancelBtn.addEventListener("click", (event)=> this.cancelGame(event, state.client.userId, 'tournament'));

		}
		else if (!this.salonTournament && !this.salonHost && !this.salonInvite && !this.salonLoad && !this.SearchRandomGame)
		{
			closeDynamicCard();

		}
		this.style_btn_tournament();
	}

	async bracketTournament()
	{
		closeDynamicCard();
		await initDynamicCard('tournament');
		const bracketContainer = document.getElementById('tournamentBracket');
		if (!bracketContainer)
			return

		for (const [key, value] of Object.entries(this.opponents))
		{
			let firstPlayer = false;
			const matchElement = document.createElement('div');
			const teamContainer = document.createElement('div');
			const roundName = document.createElement('div');
			matchElement.classList.add('match');

			if (value.round == 1)
			{
				roundName.innerText = `Round ${value.round}`;
			}
			else if (value.round == 2)
			{
				roundName.innerText = `Final`;
			}

			for (const [id, player] of Object.entries(value))
			{
				if (firstPlayer == false && id != 'round')
				{
					const team1Element = document.createElement('div');
					team1Element.classList.add('team-name');
					team1Element.textContent = player.username;

					const team1Score = document.createElement('span');
					team1Score.classList.add('score');
					team1Score.textContent = player.score !== undefined ? player.score : '-';

					teamContainer.appendChild(team1Element);
					team1Element.appendChild(team1Score);


					const vsElement = document.createElement('div');
					vsElement.classList.add('vs');
					vsElement.textContent = 'vs';

					teamContainer.appendChild(vsElement);
					firstPlayer = true

				}
				else if (id != 'round')
				{
					const team2Score = document.createElement('span');
					team2Score.classList.add('score');
					team2Score.textContent = player.score !== undefined ? player.score : '-';

					const team2Element = document.createElement('div');
					team2Element.classList.add('team-name');
					team2Element.appendChild(team2Score);
					team2Element.insertAdjacentHTML('beforeend', player.username);

					teamContainer.appendChild(team2Element);

				}
			}
			teamContainer.classList.add('team');
			matchElement.appendChild(roundName)
			matchElement.appendChild(teamContainer);
			bracketContainer.appendChild(matchElement);
		}
		this.setup_winner_tournament()

	}

	setup_winner_tournament()
	{
		for (const [id, value] of Object.entries(this.opponents))
		{
			for (const [key, player] of Object.entries(value))
			{
				const card_of_bracket = document.getElementById('tournamentBracket');
				if (card_of_bracket != null)
				{
					const winnerContainer = document.createElement('div');

					if (this.winnerId_of_tournament == null)
					{
						if (this.gameId != null)
							winnerContainer.innerText = `The winner of this tournament could be you?`
						else
						{
							winnerContainer.innerText = `Of course, the biggest loser is you! 💩`
						}
						card_of_bracket.appendChild(winnerContainer)
						return 
					}
					else if (player.user_id == this.winnerId_of_tournament)
					{
						winnerContainer.innerText = `The Winner of tournament is ${player.username} 👑`
						card_of_bracket.appendChild(winnerContainer)
						return 
					}

				}



			}
		}
	}


	async btnSearchTournament(event=null)
	{
		if (state.mainSocket == null) {
			initDynamicCard('auth');
			return;
		}
		if (state.socialApp.myStatus == 'online')
		{

			const data = {
				'status': "online",
				'type_game': "tournament"
			};

			await this.sendMsg(data);

			this.SearchRandomGame = true;

			await this.renderMatchmaking();
		}
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

		// this.cancelState();
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
				this.winnerId_of_tournament = data.body.winnerId
				// this.salonTournament = false;
				this.SearchRandomGame = false;
				this.tournament = true;
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
					console.log(`salon = ${invite.salon}`);
					if (invite.salon == false)
						this.salonHost = false;
				}

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
					if (this.SearchRandomGame == true)
						this.SearchRandomGame = false;

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

        const opponent_info =  document.getElementById("opponent-info");
        const opponent_name = document.getElementById("opponent-name");
        const opponent_picture = document.getElementById("opponent-photo");
        const opponent_cancelbtn = document.getElementById("cancel-button")
        const opponent_cards = document.getElementById('close-dynamic-card');

        if (!opponent_info || !opponent_name || !opponent_picture || !opponent_cancelbtn || !opponent_cards)
            return
        
        opponent_info.style.display = "block";
        opponent_name.textContent = name;
        opponent_picture.src = photo;
        opponent_cancelbtn.style.display = "none";
		opponent_cards.style.display = 'none'


    }

    setFriendwithoutLoader(name, picture)
    {
        const opponent_info =  document.getElementById("opponent-info");
        const opponent_name = document.getElementById("opponent-name");
        const opponent_picture = document.getElementById("opponent-photo");
        const opponent_cards = document.getElementById('close-dynamic-card');

        if (!opponent_info || !opponent_name || !opponent_picture || !opponent_cards)
            return

        opponent_info.style.display = "block";
        opponent_name.textContent = name;
        opponent_picture.src = picture;
		opponent_cards.style.display = 'none'
    }

    setFriendwithLoader(name, picture)
    {
        const opponent_info =  document.getElementById("opponent-info");
        const opponent_name = document.getElementById("opponent-name");
        const opponent_picture = document.getElementById("opponent-photo");
        const loader = document.getElementById("random-loader");

        if (!opponent_info || !opponent_name || !opponent_picture || !loader)
            return

        document.getElementById("opponent-info").style.display = "block";
        document.getElementById("opponent-name").textContent = name;
        document.getElementById("opponent-photo").src = picture;
		loader.style.display = "none";

    }

	cardFriendInvited(friendCard)
	{
        if (!friendCard)
            return
		friendCard.style.backgroundColor = '#007bff';
	}

	cardFriendReset(friendCard)
	{
        if (!friendCard)
            return
		friendCard.style.backgroundColor = "#f8f9fa";
	}

	style_btn_tournament()
	{
        const btnTournament = document.getElementsByClassName('btn-tournament');
        if (!btnTournament)
            return

		if (this.tournament) {
			btnTournament[0].classList.add('btn-tournament-inactive');
		} else {
            btnTournament[0].classList.remove('btn-tournament-inactive');
		}
	}
}
