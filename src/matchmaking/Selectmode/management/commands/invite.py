import asyncio
import json
class Guest():
    def __init__(self, player):
        self.player = player
        self.hosts = {}
        self.accepted = False


    
    def monitor_host(self, host, guest):
        # Research information host on endpoint
        # Setup player_host and player_guest infos
        already_host = self.hosts.get(host.user_id)
        if (already_host):
            already_host['guests'].update({guest.user_id: guest})
        else:
            hostGuest = {'host': host, 'guests': {guest.user_id: guest}}
        self.hosts.update({host.user_id: hostGuest})
        self.guests.update({guest.user_id: guest})

    
    async def start_1vs1RtoFront(self, id):
        data = {
            'header':{
                'service': 'mmaking',
                'dest': 'front',
                'id': id,
            },
            'body':{
                'status': 'pending',
            }
        }
        data['body']['opponents'] = self.salon.getDictPlayers()
        del data['body']['opponents'][id]
        await self.redis.publish(self.channelFront, json.dumps(data))

    async def start_1vs1RtoSocial(self, id):
        data = {
            'header':{
                'service': 'social',
                'dest': 'back',
                'id': id,
            },
            'body':{
                'status': 'ingame',
            }
        }
        await self.redis.publish(self.channelSocial, json.dumps(data))

    
    

