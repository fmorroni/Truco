const { Server } = require('socket.io');
const io = new Server(3000, {
    cors: {
        origin: ['http://localhost:5500']
    }
});

let gameRooms = {};
io.on('connection', (socket) => {
    socket.on('disconnect', () => {
        console.log('User disconnected: ' + socket.id);
    })
    
    socket.on('new-game', (gameInfo) => {
        console.log(`User ${socket.id}: `, gameInfo);
        socket.username = gameInfo.username;
        socket.join(gameInfo.gameRoom);
        gameRooms[gameInfo.gameRoom] = gameInfo;
        // console.log(gameRooms);
    });

    socket.on('join-game', (gameInfo, callback) => {
        let currentRoom = gameRooms[gameInfo.gameRoom];
        if (!currentRoom.connectedPlayers.includes(gameInfo.username)) {
            console.log(`User ${socket.id}: `, gameInfo);
            socket.username = gameInfo.username;
            socket.join(gameInfo.gameRoom);
            socket.to(gameInfo.gameRoom).emit('user-joined', gameInfo.username);
            
            currentRoom.connectedPlayers.push(gameInfo.username);
            callback(currentRoom.connectedPlayers, currentRoom.playersRequired);
            console.log(currentRoom);
        } else {
            callback(null, null);
        }
    });

    socket.on('disconnecting', (reason) => {
        for (let room of socket.rooms) {
            if (gameRooms[room]) {
                // console.log(`${socket.username} left the room ${room}`);
                socket.to(room).emit('user-left', socket.username);
                gameRooms[room].connectedPlayers.splice(gameRooms[room].connectedPlayers.indexOf(socket.username), 1);
                // console.log(gameRooms[room]);
            }
        }
    });
})