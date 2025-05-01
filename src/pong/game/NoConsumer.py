from channels.generic.websocket import AsyncJsonWebsocketConsumer

class NoConsumer(AsyncJsonWebsocketConsumer):
    
    async def connect(self):
        print("some1 on a wrong route")
        await self.close(1008)  # 1008 = Policy Violation