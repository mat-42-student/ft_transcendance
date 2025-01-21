export class Mmaking
{
	constructor(mainSocket)
	{
		this.mainS = mainSocket;
		this.token = localStorage.getItem("accessToken");
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
				'id' : 0
			}
			this.sendMsg('back', data)
		});

	}

    sendMsg(dest, message) {
        let data = {
            'header': {
                'service': 'mmaking',
            },
            'body': {
                'to':dest,
                'message': message,
            }
        };
        this.mainS.send(JSON.stringify(data));
    }

	Build_Salon()
	{
		 
	}
}