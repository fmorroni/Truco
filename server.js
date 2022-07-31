const { Server } = require('socket.io');
const io = new Server(3000, {
    cors: {
        origin: ['http://localhost:5500', 'fmorroni.github.io']
    }
});

// No habría cosas que se vuelven más simples si agrego una property socket.room???
let gameRooms = {};
io.on('connection', (socket) => {
    socket.on('disconnect', () => {
        console.log(`User ${socket.username} disconnected, ID: ${socket.id}`);
    })
    
    socket.on('new-game', (gameInfo, callback) => {
        if (!gameRooms[gameInfo.gameRoom]) {
            callback(createRoom = true);
            gameInfo.connectedPlayers = {};
            gameInfo.connectedPlayers[gameInfo.username] = 0;
            console.log(`New room created by ${socket.id}: `, gameInfo);
            gameInfo.teams = {};
            socket.username = gameInfo.username;
            socket.room = gameInfo.gameRoom;
            socket.join(gameInfo.gameRoom);
            gameRooms[gameInfo.gameRoom] = gameInfo;
        } else {
            callback(createRoom = false);
        }
    });

    socket.on('join-game', (gameInfo, callback) => {
        let currentRoom = gameRooms[gameInfo.gameRoom];
        if (currentRoom) {
            if (!currentRoom.connectedPlayers.hasOwnProperty(gameInfo.username)) {
                console.log(`User ${socket.id} joined room: `, gameInfo);
                socket.username = gameInfo.username;
                socket.room = gameInfo.gameRoom;
                socket.join(gameInfo.gameRoom);
                socket.to(gameInfo.gameRoom).emit('user-joined', gameInfo.username);
                
                currentRoom.connectedPlayers[gameInfo.username] = 0;
                callback(currentRoom.connectedPlayers, currentRoom.playersRequired, joinGame='yes');

                if (Object.keys(currentRoom.connectedPlayers).length === parseInt(currentRoom.playersRequired)) {
                    io.to(currentRoom.gameRoom).emit('all-players-connected');
                }
                console.log(currentRoom);
            } else {
                callback(null, null, joinGame='repeated-username');
            }
        } else {
            callback(null, null, joinGame='wrong-room');
            // Eso debería ir como con un socket.emit('wrong-room') al client. Y prolly arriba cuando el usuario está
            // en uso también debería ir como emit.
            console.log(`Room ${gameInfo.gameRoom} doesn't exists. Enter an existing room id or create a new game.`)
        }
    });

    socket.on('team-change', newTeam => {
        console.log(`In room ${socket.room}, player ${socket.username} changed teams to ${newTeam}`);
        socket.to(socket.room).emit('update-teams', socket.username, newTeam);
        let currentRoom = gameRooms[socket.room];

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
            let delaySeconds = 1;
            io.to(currentRoom.gameRoom).emit('teams-selected', delaySeconds);
            io.counterId = setInterval(() => {
                if (delaySeconds <= 0) {
                    console.log('timer ended');
                    let playingOrder = [];
                    for (let i = 0; i < currentRoom.teams['team_1'].length; ++i) {
                        for (let teamKey of Object.keys(currentRoom.teams)) {
                            playingOrder.push(currentRoom.teams[teamKey][i]);
                        }
                    }
                    io.to(currentRoom.gameRoom).emit('start-game', currentRoom.connectedPlayers, playingOrder);
                    currentRoom.deck = new Deck();
                    clearInterval(io.counterId);
                } else {
                    --delaySeconds;
                }
            }, 1000);
        }

        console.log(currentRoom);
    });

    socket.on('new-round', () => {
        // deal cards and stuff. Send cards on callback.
    });

    socket.on('get-hand', callback => {
        let hand = gameRooms[socket.room].deck.dealHand();
        socket.hand = hand; // To verify consistency with client.
        console.log(`Hand for ${socket.username}`, hand);
        callback(hand);
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

        // console.log('Counter ID on disconnect: ', io.counterId);
        if (io.counterId) {
            clearInterval(io.counterId);
            // console.log('Interval cleared');
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

function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

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

    dealHand(numberOfCards = 3) {
        let hand = [];
        for (let card = 0; card < numberOfCards; ++card) {
            randInt = getRandomInt(0, this.deck.length - 1);
            hand.push(this.deck.splice(randInt, 1)[0]);
        }
        return hand;
    }

    dealHands(numberOfHands = 1) {
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