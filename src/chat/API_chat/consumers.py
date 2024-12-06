import json
from asyncio import sleep as asleep
from channels.generic.base import AsyncConsumer #type:ignore

class ChatGroupConsumer(AsyncConsumer):
    async def run(self):
        # Nom du groupe auquel le conteneur doit s'abonner
        group_name = "back_chat"

        # S'abonner au groupe
        await self.channel_layer.group_add(group_name, self.channel_name)

        try:
            while True:
                # Gérer un sleep infini ou autres écouteurs asynchrones ici si nécessaire
                await asleep(1000)
        finally:
            # Nettoyage : retirer du groupe
            await self.channel_layer.group_discard(group_name, self.channel_name)

    async def chat_message(self, event):
        # Recevoir un message publié par "gateway"
        message = event['message']
        # Traiter le message (par ex. : sauvegarde en DB ou autre action)
        print(f"Message reçu : {message}")