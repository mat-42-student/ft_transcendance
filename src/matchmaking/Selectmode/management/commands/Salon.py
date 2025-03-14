
class Salon():
    def __init__(self):
        self.players = {}
        self.type_game = ""
        self.score1 = None
        self.score2 = None
        
    def __str__(self):
        for value in self.players.values():
            return(f'Salon : {value} type_game: {self.type_game}')

    def getDictPlayers(self):
        players = {}
        for key, player in self.players.items():
            players.update({key: player.getDict()})

        return (players)