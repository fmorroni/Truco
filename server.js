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
            console.log(`User ${socket.id}: `, gameInfo);
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
                console.log(`User ${socket.id}: `, gameInfo);
                socket.username = gameInfo.username;
                socket.join(gameInfo.gameRoom);
                socket.to(gameInfo.gameRoom).emit('user-joined', gameInfo.username);
                
                currentRoom.connectedPlayers.push(gameInfo.username);
                callback(currentRoom.connectedPlayers, currentRoom.playersRequired, true);
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
        console.log(room);
        if (gameRooms[room]) {
            console.log(`${socket.username} left the room ${room}`);
            socket.to(room).emit('user-left', socket.username);
            gameRooms[room].connectedPlayers.splice(gameRooms[room].connectedPlayers.indexOf(socket.username), 1);
            
            // io.sockets.adapter.rooms.get(roomName).size
            console.log('Socket.adapter.rooms');
            console.log(socket.adapter.rooms.get(room));
            console.log('io.sockets.adapter.rooms');
            console.log(io.sockets.adapter.rooms.get(room));

            // console.log(gameRooms);
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
})