const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    socket.on('join-room', (data) => {
        socket.join(data.roomId);
        socket.nickname = data.nickname;
        // Baki sabko batana ki naya banda aaya hai
        socket.to(data.roomId).emit('user-joined', { id: socket.id, nickname: data.nickname });
    });

    socket.on('signal', (data) => {
        io.to(data.to).emit('signal', { from: socket.id, signal: data.signal, nickname: data.nickname });
    });

    // Room dismiss logic
    socket.on('dismiss-room', (roomId) => {
        io.to(roomId).emit('room-dismissed');
    });

    socket.on('disconnect', () => {
        io.emit('user-left', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Leo Hub Pro Active`));
