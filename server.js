const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

const rooms = {};

io.on('connection', (socket) => {
    socket.on('join-room', (data) => {
        const { roomId, nickname } = data;
        if (rooms[roomId] && rooms[roomId].size >= 4) {
            socket.emit('room-full'); 
            return; 
        }
        socket.join(roomId);
        socket.nickname = nickname;
        socket.room = roomId;
        if (!rooms[roomId]) {
            rooms[roomId] = new Set();
        }
        rooms[roomId].add(socket.id);
        socket.to(roomId).emit('user-joined', { id: socket.id, nickname: nickname });
    });

    socket.on('signal', (data) => {
        io.to(data.to).emit('signal', {
            from: socket.id,
            signal: data.signal,
            nickname: socket.nickname
        });
    });

    socket.on('dismiss-room', (roomId) => {
        io.to(roomId).emit('room-dismissed');
        if (rooms[roomId]) {
            delete rooms[roomId];
        }
    });

    socket.on('disconnect', () => {
        const roomId = socket.room;
        if (roomId && rooms[roomId]) {
            rooms[roomId].delete(socket.id);
            if (rooms[roomId].size === 0) {
                delete rooms[roomId];
            }
        }
        io.to(roomId).emit('user-left', socket.id);
    });
});

setInterval(() => {
    https.get('https://your-app-url.onrender.com', (res) => {
    }).on('error', (e) => {
    });
}, 300000);

const PORT = process.env.PORT || 3000;
server.listen(PORT);
