import { state } from './main.js';
import { initDynamicCard, closeDynamicCard } from './components/dynamic_card.js';
import { WebGame } from './WebGame.js';
import { LocalGame } from './LocalGame.js';

export class Mmaking
{
    constructor()
    {
		this.invited_by = {};
		this.guests = {};
		for (let [key, value] of state.socialApp.friendList)
		{
			const keyNumber = Number(key);
			if (keyNumber != NaN)
			{
				console.log(typeof(keyNumber))
				this.invited_by[keyNumber] = false;
				this.guests[keyNumber] = false;
			}
		}
		this.host = false;
		this.opponents = {};
		this.SearchRandomGame = false;
		this.cancel = {'random': false, 'invitation': false, 'tournament': false};
		this.salonInvite = false;
		this.salonRandom = false;
		this.game = null;
    }

	async renderMatchmaking()
	{
		await this.renderHost();
		this.renderGuest();
	}

	async renderHost()
	{

		for (const [key, value] of Object.entries(this.guests))
		{
			const friend = state.socialApp.friendList.get(Number(key));

			console.log(typeof(key));
			const cardFriend = document.getElementsByClassName(`friend-item-${key}`);

			if (friend && (value == true || value == false))
			{
				if (value == true)
				{
					console.log('Reset card friend');
					this.cardFriendReset(cardFriend[0])
				}
				else
				{
					this.cardFriendReset(cardFriend[0]);
				}
			}
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
			const btnHost = document.getElementsByClassName(`btn-match-${key}`);
			const btnMatchPicture = document.getElementById(`btn-match-picture-${key}`)
			const friend = state.socialApp.friendList.get(Number(key));

			if(value == false)
			{
				console.group(key);
				btnMatchPicture.src = "/ressources/vs.png";
				btnHost[0].removeEventListener('click',(event)=>this.btnInviteActive(event));
				btnHost[0].addEventListener('click', (event) => this.btnInviteDesactive(event));
			}
			else if (value == null)
			{
				btnMatchPicture.src = "/ressources/vs_active.png";
				btnHost[0].removeEventListener('click',this.btnInviteDesactive);
				btnHost[0].removeEventListener('click',state.socialApp.handleMatchClick);
				btnHost[0].addEventListener('click', (event) => this.btnInviteActive(event));
			}
			else if (value == true && this.salonInvite == true)
			{
				closeDynamicCard();
				await initDynamicCard('salonGuest');
				this.setOpponentInvite(value.username, `../../../media/${value.avatar}`)
			}
		}
	}

	renderSalonInvite()
	{
		if (salonInvite == true)
		{
			const friend = null;
			if (this.host == true)
			{
				initDynamicCard('salonHost');
			}
			else if (this.host == false)
				initDynamicCard('salonGuest');
		}
		this.setOpponentInvite(friend.username, `../../../media/${friend.avatar}` );
	}


	async btnInviteDesactive(event)
	{
		const friendId = event.currentTarget.dataset.friendId;


		const data =
		{
			'type_game': {
				'invite': {
					'guest_id': friendId
				}
			}
		};

		this.guests[friendId] = null;
		this.invited_by[friendId] = false;
		this.salonInvite = true;
		this.host = true;

		await this.sendMsg(data);
		this.renderMatchmaking();
	}

	async btnInviteActive(event)
	{
		const friendId = event.currentTarget.dataset.friendId;
		const btnInviteAccept = document.getElementsByClassName('btn-accepter');
		const btnInviteRefuse = document.getElementsByClassName('btn-refuser');

		await initDynamicCard('vs_active');

		btnInviteAccept[0].addEventListener('click', (event) => this.btnInviteAccept(event));
		btnInviteRefuse[0].addEventListener('click', (event) => this.btnInviteRefuse(event));
	}

	async btnInviteAccept(event)
	{
		const friendId = event.currentTarget.dataset.friendId;

		const data = {
			'type_game': {
				'invite':{
					'host_id': friendId,
					'accept': true
				}
			}
		};

		this.guests[friendId] = false;
		this.invited_by[friendId] = true;
		this.host = false;
		this.salonInvite = true;

		await this.sendMsg(data);
		this.renderMatchmaking();
	}

	async btnInviteRefuse(event)
	{
		const friendId = event.currentTarget.dataset.friendId;

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
		this.host = true;
		this.salonInvite = false;

		await this.sendMsg(data);
	}


	rederRandom()
	{
		if (this.SearchRandomGame == true)
		{
			initDynamicCard('versus');
		}
		if (this.salonRandom == true)
		{
			for (const [key, value] of Object.entries(this.opponents))
			{
				this.setOpponent(value.username, `../../../media/${value.avatar}`)
			}
			state.gameApp.launchGameSocket(this.game);
		}

	}






    refresh_eventlisteners()
    {
        this.listening_button_match_Random();
        this.bindLocalBotButton();
        this.bindLocal1v1Button();
    }

    listening_button_match_Random()
    {
        const randomBtn = document.getElementById('btn-versus');
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

    bindLocalBotButton() {
        const button = document.getElementById('btn-local-bot');
        button.addEventListener('click', () => {
            if (state.gameApp != null) {
                console.warn('Already playing, ignoring');  //TODO do this more nicely maybe
                return;
            }

            state.gameApp = new LocalGame(true);
        });
    }

    bindLocal1v1Button() {
        const button = document.getElementById('btn-local-versus');
        button.addEventListener('click', () => {
            if (state.gameApp != null) {
                console.warn('Already playing, ignoring');  //TODO do this more nicely maybe
                return;
            }

            state.gameApp = new LocalGame(false);
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
            for (const [key, value] of Object.entries(data.body.opponents))
                this.setOpponent(value.username, '../../../media/default.png', value.type_game)
/* TODO move this block: this happens after initializing a Webgame, responding to message init
            let levelName = null;
            try {
                levelName = 'debug';  //TODO get server to pick this
            } catch(e) {
                throw e;  //TODO can't play a game without a level - this should cancel the game, for server and opponent too.
            }

            let opponentName = 'Opponent name error';
            try {
                //REVIEW sus blind indexing, is there a better way?
                opponentName = Object.values(data.body.opponents)[0].username;
            } catch (e) {
                // Game is still playable without opponent name: complain, but continue.
                console.error('Opponent name could not be retrieved.');
            }
 */
            let gameId;
            try {
                gameId = data.body.id_game;
                if (typeof gameId !== 'number' || gameId < 0 || !Number.isInteger(gameId))
                    throw Error('')
            } catch(e) {
                throw e;  //TODO this should cancel the game
            }

            state.gameApp = new WebGame(levelName, opponentName);
            state.gameApp.launchGameSocket(gameId);
        }
		else if (data.body.cancel == true)
		{
			console.log('Reset img and card');
			const friendlist = document.querySelectorAll('.friend-item');

			friendlist.forEach(friend => {
				if (friend.dataset.userid == data.body.type_game.invite.host_id )
				{
					const btnmatch = friend.querySelector('.btn-match');
					const imgmatch = btnmatch.getElementsByTagName('img');
					imgmatch[0].src = "/ressources/vs.png";
					this.ResetCardFriend(btnmatch);
					btnmatch.dataset.invite = false;
					return ;
				}
			});
			closeDynamicCard();
		}
		// Routing to communication mode Invite
        else if (data.body.type_game.invite)
        {
			const invite = data.body.type_game.invite;
            if (invite.host_id)
				this.invited_by[invite.host_id] = null;

			this.renderMatchmaking();
        }
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



	//friendIngame()

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

    setGuest(name, picture)
    {
        document.getElementById("opponent-info").style.display = "block";
        document.getElementById("opponent-name").textContent = name;
        document.getElementById("opponent-photo").src = picture;

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