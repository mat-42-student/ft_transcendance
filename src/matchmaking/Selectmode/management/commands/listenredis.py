#from django.core.management.base import BaseCommand
#from redis.asyncio import from_url
#from asyncio import asyncio, run as arun 

#class Command(BaseCommand):
    #help = "Commande pour écouter un canal Redis avec Pub/Sub"    
    #def handle(self, *args, **kwargs):
        ## Démarre la boucle asyncio avec arun
        #arun(self.main())   

    #async def main(self):
        #self.redis_client = await from_url("redis://redis:6379", decode_responses=True)
        #self.pubsub = self.redis_client.pubsub(ignore_subscribe_messages=True)
        #self.group_name = "back_chat"        
        #print(f"Subscribing to channel: {self.group_name}")
        #await self.pubsub.subscribe(self.group_name)        # Lancement des tâches
        #self.shutdown_event = asyncio.Event()
        
        #listener_task = asyncio.create_task(self.listen())
        #shutdown_task = asyncio.create_task(self.wait_for_shutdown())
        #try:
            ## Création et attente explicite de la tâche de listener
            #await asyncio.wait([listener_task, shutdown_task], return_when=asyncio.FIRST_COMPLETED)
        #finally:
            ## Nettoyage des ressources
            #await self.cleanup()    
    #async def listen(self):
        #print("Listening for messages...")
        #async for msg in self.pubsub.listen():
            #if self.shutdown_event.is_set():
                #break
            #if msg : #and msg['type'] == 'message':  # Filtre uniquement les messages réels
                #print(f"Message received: {msg['data']}")
    
    #async def cleanup(self):
        #print("Cleaning up Redis connections...")
        #await self.pubsub.close()
        #await self.redis_client.close()

    #async def wait_for_shutdown(self):
        #try:
            #while not self.shutdown_event.is_set():
                #await asyncio.sleep(1)
        #except asyncio.CancelledError:
            #pass
        #print("Shutdown task completed.")
        #self.shutdown_event.set()