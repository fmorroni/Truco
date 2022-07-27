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
            gameInfo.connectedPlayers = [gameInfo.username];
            console.log(`New room created by ${socket.id}: `, gameInfo);
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
            if (!currentRoom.connectedPlayers.includes(gameInfo.username)) {
                console.log(`User ${socket.id} joined room: `, gameInfo);
                socket.username = gameInfo.username;
                socket.join(gameInfo.gameRoom);
                socket.to(gameInfo.gameRoom).emit('user-joined', gameInfo.username);
                
                currentRoom.connectedPlayers.push(gameInfo.username);
                callback(currentRoom.connectedPlayers, currentRoom.playersRequired, true);

                // io.to(currentRoom.gameRoom).emit('server-message', currentRoom);
                if (currentRoom.connectedPlayers.length === parseInt(currentRoom.playersRequired)) {
                    let delaySeconds = 5;
                    io.to(currentRoom.gameRoom).emit('start-game', delaySeconds);
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

    socket.on('disconnecting', (reason) => {
        let room = Array.from(socket.rooms)[1];
        if (gameRooms[room]) {
            console.log(`${socket.username} left the room ${room}`);
            // If it's 1 it means the current client, who is about to disconnect,
            // is the last client in the room. So delete that room.
            if (socket.adapter.rooms.get(room).size === 1) {
                delete gameRooms[room];
                console.log(`Room ${room} deleted`);
            } else {
                socket.to(room).emit('user-left', socket.username);
                gameRooms[room].connectedPlayers.splice(gameRooms[room].connectedPlayers.indexOf(socket.username), 1);
            }
            
        }
        // console.log(socket.rooms);
    });

    socket.on('print-gameInfo', (room) => {
        console.log(gameRooms[room]);
    })

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