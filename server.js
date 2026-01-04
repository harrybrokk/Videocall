const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// यह ऑब्जेक्ट रूम की जानकारी रखेगा
const rooms = {};

// यह लाइन "Not Found" की प्रॉब्लम को ठीक करती है
// यह सर्वर को बताती है कि जब कोई वेबसाइट खोले, तो उसे index.html फाइल भेजनी है
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);

    socket.on('join-room', (data) => {
        const { roomId, nickname } = data;

        // --- Room Full Logic (4 लोगों की लिमिट) ---
        if (rooms[roomId] && rooms[roomId].size >= 4) {
            socket.emit('room-full');
            return;
        }

        socket.join(roomId);
        
        if (!rooms[roomId]) {
            rooms[roomId] = new Set();
        }
        rooms[roomId].add(socket.id);

        console.log(`${nickname} (${socket.id}) joined room: ${roomId}`);
        socket.nickname = nickname;
        socket.room = roomId;

        // नए यूजर को छोड़कर, रूम में मौजूद सभी को बताएं
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
            delete rooms[roomId];
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected:', socket.id);
        const roomId = socket.room;
        if (roomId && rooms[roomId]) {
            rooms[roomId].delete(socket.id);
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
    console.log(`VID CALL Server is live on *:${PORT}`);
});
