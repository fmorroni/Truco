const { Server } = require('socket.io');
const io = new Server(3000, {
    cors: {
        origin: ['http://localhost:5500', 'fmorroni.github.io']
    }
});

let gameRooms = {};
io.on('connection', (socket) => {
    socket.on('disconnect', () => {
        console.log(`User ${socket.username} disconnected, ID: ${socket.id}`);
    })
    
    socket.on('new-game', (gameInfo, callback) => {
        if (!gameRooms[gameInfo.gameRoom]) {
            callback(true);
            gameInfo.connectedPlayers = {};
            gameInfo.connectedPlayers[gameInfo.username] = gameInfo.team;
            console.log(`New room created by ${socket.id}: `, gameInfo);
            gameInfo.teams = {};
            socket.username = gameInfo.username;
            socket.join(gameInfo.gameRoom);
            gameRooms[gameInfo.gameRoom] = gameInfo;
        } else {
            callback(false);
        }
    });

    socket.on('join-game', (gameInfo, callback) => {
        let currentRoom = gameRooms[gameInfo.gameRoom];
        if (currentRoom) {
            if (!currentRoom.connectedPlayers.hasOwnProperty(gameInfo.username)) {
                console.log(`User ${socket.id} joined room: `, gameInfo);
                socket.username = gameInfo.username;
                socket.join(gameInfo.gameRoom);
                socket.to(gameInfo.gameRoom).emit('user-joined', gameInfo.username);
                
                currentRoom.connectedPlayers[gameInfo.username] = 0;
                callback(currentRoom.connectedPlayers, currentRoom.playersRequired, true);

                if (Object.keys(currentRoom.connectedPlayers).length === parseInt(currentRoom.playersRequired)) {
                    io.to(currentRoom.gameRoom).emit('all-players-connected');
                }
                console.log(currentRoom);
            } else {
                callback(null, null, false);
            }
        } else {
            callback(null, null);
            // Eso debería ir como con un socket.emit('wrong-room') al client. Y prolly arriba cuando el usuario está
            // en uso también debería ir como emit.
            console.log(`Room ${gameInfo.gameRoom} doesn't exists. Enter an existing room id or create a new game.`)
        }
    });

    socket.on('team-change', (room, newTeam) => {
        console.log(`In room ${room}, player ${socket.username} changed teams to ${newTeam}`);
        socket.to(room).emit('update-teams', socket.username, newTeam);
        let currentRoom = gameRooms[room];

        let oldTeamKey = 'team_' + currentRoom.connectedPlayers[socket.username];
        if (currentRoom.teams.hasOwnProperty(oldTeamKey)) {
            currentRoom.teams[oldTeamKey].splice(currentRoom.teams[oldTeamKey].indexOf(socket.username), 1);
        }

        let newTeamKey = 'team_' + newTeam;
        if (currentRoom.teams.hasOwnProperty(newTeamKey)) {
            currentRoom.teams[newTeamKey].push(socket.username);
        } else {
            currentRoom.teams[newTeamKey] = [socket.username];
        }

        currentRoom.connectedPlayers[socket.username] = newTeam;

        let teamsSelected = false;
        if (Object.keys(currentRoom.teams).length === 2) {
            for (let teamKey of Object.keys(currentRoom.teams)) {
                let team = currentRoom.teams[teamKey];
                if (team.length === parseInt(currentRoom.playersRequired)/2) {
                    teamsSelected = true;
                } else {
                    teamsSelected = false;
                    break;
                }
            }
        }

        if (teamsSelected) {
            let delaySeconds = 5;
            io.to(currentRoom.gameRoom).emit('teams-selected', delaySeconds);
            let tid = setInterval(() => {
                if (delaySeconds <= 0) {
                    console.log('timer ended');
                    io.to(currentRoom.gameRoom).emit('start-game');
                    clearInterval(tid);
                } else {
                    --delaySeconds;
                }
            }, 1000);
        }

        console.log(currentRoom);
    });

    socket.on('disconnecting', (reason) => {
        let room = Array.from(socket.rooms)[1];
        let currentRoom = gameRooms[room];
        if (currentRoom) {
            console.log(`${socket.username} left the room ${room} because of ${reason}`);
            // If it's 1 it means the current client, who is about to disconnect,
            // is the last client in the room. So delete that room.
            if (socket.adapter.rooms.get(room).size === 1) {
                delete gameRooms[room];
                console.log(`Room ${room} deleted`);
            } else {
                socket.to(room).emit('user-left', socket.username);
                let teamKey = 'team_' + currentRoom.connectedPlayers[socket.username];
                if (currentRoom.teams.hasOwnProperty(teamKey)) {
                    currentRoom.teams[teamKey].splice(currentRoom.teams[teamKey].indexOf(socket.username), 1);
                }
                delete currentRoom.connectedPlayers[socket.username];
            }
        }
        // console.log(socket.rooms);
    });

    socket.on('print-gameInfo', (room) => {
        console.log(gameRooms[room]);
    });

    socket.on('shutdown-server', () => {
        let shutdownTime = 2;
        io.emit('server-shutdown', `Server will shut-down in ${shutdownTime} seconds`);
        setTimeout(() => {
            io.close();
        }, 1000*shutdownTime);
    });
});

function getRandomInt(min, max) {
    min = Math.floor(min);
    max = Math.floor(max);
    randInt = Math.floor(getRandomNumber(min, max + 1));
    // In case Math.random returns a 1.
    if (randInt == max + 1) {
        randInt = max;
    }

    return randInt;
}

class Card {
    constructor(number, suit) {
        this.number = number;
        this.suit = suit;
    }
}

class Deck {
    static numbers = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
    static suits = ['espada', 'oro', 'basto', 'copa'];

    constructor() {
        this.deck = this.generateDeck();
    }

    generateDeck() {
        let deck = [];
        for (const number of Deck.numbers) {
            for (const suit of Deck.suits) {
                deck.push(new Card(number, suit));
            }
        }

        return deck;
    }

    dealHands(numberOfHands) {
        let hands = [];
        for (let i = 0; i < numberOfHands; ++i) {
            let cardsInHand = 3;
            let hand = [];
            for (let card = 0; card < cardsInHand; ++card) {
                randInt = getRandomInt(0, this.deck.length - 1);
                hand.push(this.deck.splice(randInt, 1)[0]);
            }
            hands.push(hand);
        }
        return hands;
    }

    addCard(card) {
        this.deck.push(card);
    }
}