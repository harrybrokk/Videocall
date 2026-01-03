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

    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        // Room mein baki logo ko batana ki naya banda aaya hai
        socket.to(roomId).emit('user-connected', userId);

        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId);
        });

        // WebRTC Signaling Forwarding
        socket.on('signal', (data) => {
            io.to(data.to).emit('signal', {
                from: socket.id,
                signal: data.signal
            });
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Leo Connect Live on ${PORT}`));
