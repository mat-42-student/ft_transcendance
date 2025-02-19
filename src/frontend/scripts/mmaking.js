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

    async incomingMsg(data)
    {
        
		// Routing to lauch game and open websocket Game
        if (data.body.status == 'ingame')
        {
            for (const [key, value] of Object.entries(data.body.opponents))
                this.setOpponent(value.username, '../../../media/avatars/default.png')

            state.gameApp = new Game();
            state.gameApp.launchGameSocket();
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
		}
		// Routing to communication mode Invite
        else if (data.body.type_game.invite)
        {
            const invite = data.body.type_game.invite;
			const guest_id = Number(data.body.type_game.invite.guest_id);
			const host_id = Number(data.body.type_game.invite.host_id);
            console.log(invite);

			// Invitation is accepted: all next msg by server come here
			try
			{
				if (invite.accept == true)
				{
					if (host_id)
					{
						await initDynamicCard('salonGuest');

					}
					else if (guest_id)
					{
						await initDynamicCard('salonHost');
						const startgame = document.getElementById("start-game");
						console.log(startgame);
						startgame.addEventListener('click', async (event) =>
						{
							const data = {
								'type_game': {
									'invite':{
										'guest_id': guest_id,
										'accept': true,
										'startgame': true 
									}
								}
							};
							await this.sendMsg(data);
						});

					}
					
					this.desableOverlay();
					this.setGuest(invite.username, '../../../media/avatars/default.png');

					const friendlist = document.querySelectorAll('.friend-item');

					friendlist.forEach(friend => {

							const btnmatch = friend.querySelector('.btn-match');
							this.ResetCardFriend(btnmatch)
							return ;
						
					});
				}
				else if (invite.accept == false)
				{
					const friendlist = document.querySelectorAll('.friend-item');
				
					friendlist.forEach(friend => {
						if (friend.dataset.userid == data.body.type_game.invite.guest_id )
						{
							const btnmatch = friend.querySelector('.btn-match');
							this.ResetCardFriend(btnmatch)
							return ;
						}
					});
				}

				// Invitation come here to notif the client
				else if (invite.accept == null)
				{
					const friendlist = document.querySelectorAll('.friend-item');
				
					friendlist.forEach(friend => {
						if (friend.dataset.userid == data.body.type_game.invite.host_id )
						{
							const btnmatch = friend.querySelector('.btn-match');
							const imgmatch = btnmatch.getElementsByTagName('img');
							imgmatch[0].src = "/ressources/vs_active.png";
							btnmatch.dataset.invite = 1;
							return ;
						}
					});
				}
			}
			catch (error)
			{
				
				console.log("RESET btn-match")
				// Reset btn-match if server send cancel

				console.log(error);
			}
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

	

    async invite(guestid, target)
    {
        if (target.dataset.invite == 1)
        {
            await initDynamicCard('vs_active');
			this.desableOverlay();

            
            const acceptInvitation = document.querySelector('.invitation .btn-accepter');
			const refuseInvitation = document.querySelector('.invitation .btn-refuser');

            acceptInvitation.addEventListener('click', async (event)=>{

                const data = {
                    'type_game': {
                        'invite':{
                            'host_id': guestid,
                            'accept': true
                        }
                    }
                };
                await this.sendMsg(data);
                target.dataset.invite = false
                target.getElementsByTagName('img')[0].src = '/ressources/vs.png';

                closeDynamicCard()
            });
			refuseInvitation.addEventListener('click', async (event)=>{

                const data = {
                    'type_game': {
                        'invite':{
                            'host_id': guestid,
                            'accept': false
                        }
                    }
                };
                await this.sendMsg(data);
                target.dataset.invite = false
                target.getElementsByTagName('img')[0].src = '/ressources/vs.png';

                closeDynamicCard()
            });
        }
        else
        {

            const data = 
            {
                'type_game': {
                    'invite': {
                        'guest_id': guestid
                    }
                }
            };
            await this.sendMsg(data);
			this.waitReponseofGuest(target);
        }
    }

	waitReponseofGuest(target)
	{
		//target.style.display = 'none';
		const frienditem = target.closest('.friend-item');
		frienditem.style.backgroundColor = 'blue';
	}

	ResetCardFriend(target)
	{
		//target.style.display = 'block';
		const frienditem = target.closest('.friend-item');
		frienditem.style.backgroundColor = "#f8f9fa";
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

    setOpponent(name, photo) {
        document.getElementById("opponent-info").style.display = "block";
        document.getElementById("opponent-name").textContent = name;
        document.getElementById("opponent-photo").src = photo;
        document.getElementById("status").textContent = "Adversaire trouvé !";
        document.getElementById("loader").style.display = "none";
        document.getElementById("waiting-text").textContent = "Préparez-vous à jouer !";
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