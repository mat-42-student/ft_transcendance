import asyncio
import json
class Invite():
    def __init__(self, redis, channel_front, channel_social):
        self.hosts = None
        self.guests = None
        self.salon = None
        self.redis = redis
        self.channelFront = channel_front
        self.channelSocial = channel_social

    
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

    
    

