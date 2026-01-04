const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// यह ऑब्जेक्ट हर रूम में कितने लोग हैं, उसका हिसाब रखेगा
const rooms = {};

// --- "Not Found" Problem Fixed Here ---
// यह सर्वर को बताता है कि जब कोई वेबसाइट खोले, तो उसे index.html फाइल भेजनी है
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('User Connected:', socket.id);

    socket.on('join-room', (data) => {
        const { roomId, nickname } = data;

        // --- 4-User Limit Logic Added Here ---
        if (rooms[roomId] && rooms[roomId].size >= 4) {
            socket.emit('room-full');
            return; // यूजर को रूम ज्वाइन करने से रोकें
        }

        socket.join(roomId);

        // रूम की गिनती को अपडेट करें
        if (!rooms[roomId]) {
            rooms[roomId] = new Set();
        }
        rooms[roomId].add(socket.id);

        socket.nickname = data.nickname;
        socket.room = roomId; // बाद में disconnect के लिए रूम आईडी को सेव करें

        // रूम के बाकी लोगों को बताएं कि नया यूजर आया है
        socket.to(roomId).emit('user-joined', { id: socket.id, nickname: data.nickname });
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
            delete rooms[roomId]; // रूम की जानकारी को डिलीट करें
        }
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected:', socket.id);
        const roomId = socket.room;
        if (roomId && rooms[roomId]) {
            // रूम से यूजर को हटाएं
            rooms[roomId].delete(socket.id);
            // अगर रूम खाली हो गया है, तो उसे डिलीट कर दें
            if (rooms[roomId].size === 0) {
                delete rooms[roomId];
            }
        }
        // सिर्फ उसी रूम के लोगों को बताएं कि यूजर चला गया है
        io.to(roomId).emit('user-left', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`VID CALL Server is Active on port ${PORT}`));
