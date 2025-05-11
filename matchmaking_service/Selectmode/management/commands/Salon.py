
class Salon():
    def __init__(self):
        self.players = {}
        self.type_game = ""
        self.score1 = None
        self.score2 = None
        
    def __str__(self):
        flux = ''
        for value in self.players.values():
            flux += (f'{value} type_game: {self.type_game} ' + '\t')
        
        return flux

    def getDictPlayers(self):
        players = {}
        firstScoreIsSet = False
        dict = {}
        for key, player in self.players.items():
            dict = player.getDict()
            if (firstScoreIsSet == False):
                dict.update({'score': self.score1})
                firstScoreIsSet = True
            elif (firstScoreIsSet == True):
                dict.update({'score': self.score2})
            players.update({key: dict})
        return (players)
    
    def all_players_have_errors_SocketGame(self):
        for player in self.players.values():
            print(f'player {player.user_id} SocketGame is online ? {player.socketGame_is_online}')
            if (player.socketGame_is_online == True or player.socketGame_is_online == None):
                return False
        return True
    
    def all_players_have_leave_game(self):
        for player in self.players.values():
            print(f'player {player.user_id} leave the game ? {player.leave_game}')
            if (player.leave_game == False):
                return False
        return True