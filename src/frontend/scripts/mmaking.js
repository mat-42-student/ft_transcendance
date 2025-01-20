export class Mmaking
{
	constructor(mainSocket)
	{
		this.mainS = mainSocket;
		this.token = localStorage.getItem("accessToken");
		this.listening_button_match_Random();
	}

	async listening_button_match_Random()
	{
		const randomBtn = document.getElementById('versus');
		if (!randomBtn)
			return ;
		randomBtn.addEventListener('click', ()=>
		{
			const data = {
				'id' : 0
			}
			this.sendMsg('back', data)
		});

	}

    async sendMsg(dest, message) {
        let data = {
            'header': {
                'service': 'mmaking',
            },
            'body': {
                'to':dest,
                'message': message,
            }
        };
        await this.mainSocket.send(JSON.stringify(data));
    }

	Build_Salon()
	{
		 
	}
}