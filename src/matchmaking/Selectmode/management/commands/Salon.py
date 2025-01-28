
class Salon():
    def __init__(self):
        self.players = {}
        self.type_game = ""
        
    def __str__(self):
        for value in self.players.values():
            return(f'Salon : {value} type_game: {self.type_game}')

