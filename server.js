const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// यह ऑब्जेक्ट रूम की जानकारी रखेगा
const rooms = {};

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('join-room', (data) => {
        const { roomId, nickname } = data;

        // --- Room Full Logic (Server Side) ---
        if (rooms[roomId] && rooms[roomId].size >= 4) {
            socket.emit('room-full');
            return;
        }

        socket.join(roomId);
        
        // अगर रूम मौजूद नहीं है, तो एक नया Set बनाएं
        if (!rooms[roomId]) {
            rooms[roomId] = new Set();
        }
        // यूजर को रूम में जोड़ें
        rooms[roomId].add(socket.id);

        console.log(`${nickname} (${socket.id}) joined room: ${roomId}`);
        socket.nickname = nickname; // निकनेम को सॉकेट ऑब्जेक्ट में सेव करें
        socket.room = roomId; // रूम आईडी को भी सेव करें

        // उस रूम में मौजूद दूसरे यूजर्स को बताएं कि कोई नया आया है
        socket.to(roomId).emit('user-joined', { id: socket.id, nickname: nickname });
    });

    socket.on('signal', (data) => {
        // सिग्नल को सही यूजर तक पहुंचाएं
        io.to(data.to).emit('signal', {
            from: socket.id,
            signal: data.signal,
            nickname: socket.nickname
        });
    });
    
    socket.on('dismiss-room', (roomId) => {
        io.to(roomId).emit('room-dismissed');
        if(rooms[roomId]) {
            delete rooms[roomId]; // रूम की जानकारी को डिलीट करें
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        const roomId = socket.room;
        if (roomId && rooms[roomId]) {
            // रूम से यूजर को हटाएं
            rooms[roomId].delete(socket.id);
            // अगर रूम खाली हो गया है, तो उसे डिलीट कर दें
            if (rooms[roomId].size === 0) {
                delete rooms[roomId];
            }
        }
        // सबको बताएं कि यह यूजर चला गया है
        io.to(roomId).emit('user-left', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});
