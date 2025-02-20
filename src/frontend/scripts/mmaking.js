import { state } from './main.js';
import { initDynamicCard, closeDynamicCard } from './components/dynamic_card.js';
import { WebGame } from './WebGame.js';

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

        if (data.body.status == 'ingame')
        {
            for (const [key, value] of Object.entries(data.body.opponents))
                this.setOpponent(value.username, '../../../media/avatars/default.png')

            state.gameApp = new WebGame();
            state.gameApp.launchGameSocket();
        }
        else if (data.body.type_game.invite)
        {
            const invite = data.body.type_game.invite;
            console.log(invite);
            if (invite.accept == true)
            {
                await initDynamicCard('salonInvite');
                this.setGuest(invite.username, '../../../media/avatars/default.png');
            }
            else{
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
    }

    async invite(guestid, target)
    {
        if (target.dataset.invite == 1)
        {
            await initDynamicCard('vs_active');

            const acceptInvitation = document.querySelector('.invitation .btn-accepter');
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
        }
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

    setGuest(name, picture)
    {
        document.getElementById("opponent-info").style.display = "block";
        document.getElementById("opponent-name").textContent = name;
        document.getElementById("opponent-photo").src = picture;
        document.getElementById("waiting-text").textContent = "Préparez-vous à jouer !";

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