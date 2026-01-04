const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('User Connected:', socket.id);

    // Jab user room join karta hai
    socket.on('join-room', (data) => {
        socket.join(data.roomId);
        socket.nickname = data.nickname; // Nickname ko socket object mein store karna

        // Room ke baki logo ko batana ki naya banda aaya hai
        socket.to(data.roomId).emit('user-joined', { id: socket.id, nickname: data.nickname });
    });

    // WebRTC Signaling Forwarding
    socket.on('signal', (data) => {
        // data.to pe signal bhejna
        io.to(data.to).emit('signal', {
            from: socket.id,
            signal: data.signal,
            nickname: socket.nickname // Nickname ko signal ke saath forward karna
        });
    });

    // Room dismiss logic
    socket.on('dismiss-room', (roomId) => {
        io.to(roomId).emit('room-dismissed');
    });

    // Jab koi user disconnect ho jaye
    socket.on('disconnect', () => {
        io.emit('user-left', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Leo Connect Hub Active`));
