
class Salon():
    def __init__(self):
        self.players = {}
        self.type_game = ""
        self.score1 = None
        self.score2 = None
        
    def __str__(self):
        for value in self.players.values():
            return(f'Players : {value} type_game: {self.type_game}')

    def getDictPlayers(self):
        players = {}
        score1isSet = False
        dict = {}
        for key, player in self.players.items():
            dict = player.getDict()
            if (score1isSet == False):
                dict.update({'score1': self.score1})
                score1isSet = True
            else:
                dict.update({'score2':self.score2})
                score1isSet = False
            players.update({key: dict})
        return (players)