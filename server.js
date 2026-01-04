const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// यह लाइन वैसी ही रहेगी जैसी आपके कोड में थी
app.use(express.static('public'));

// --- Added Here: यह ऑब्जेक्ट रूम की गिनती रखेगा ---
const rooms = {};

io.on('connection', (socket) => {
    console.log('User Connected:', socket.id);

    // Jab user room join karta hai
    socket.on('join-room', (data) => {
        const { roomId, nickname } = data;

        // --- Added Here: 4-User Limit Check ---
        if (rooms[roomId] && rooms[roomId].size >= 4) {
            socket.emit('room-full'); // सिर्फ इसी यूजर को बताएं कि रूम फुल है
            return; // उसे ज्वाइन करने से रोक दें
        }

        socket.join(roomId);
        socket.nickname = nickname;
        socket.room = roomId; // --- Added Here: Disconnect के लिए रूम आईडी सेव करें ---

        // --- Added Here: रूम में यूजर की गिनती को अपडेट करें ---
        if (!rooms[roomId]) {
            rooms[roomId] = new Set();
        }
        rooms[roomId].add(socket.id);

        // Room ke baki logo ko batana ki naya banda aaya hai
        socket.to(roomId).emit('user-joined', { id: socket.id, nickname: nickname });
    });

    // WebRTC Signaling Forwarding
    socket.on('signal', (data) => {
        io.to(data.to).emit('signal', {
            from: socket.id,
            signal: data.signal,
            nickname: socket.nickname
        });
    });

    // Room dismiss logic
    socket.on('dismiss-room', (roomId) => {
        io.to(roomId).emit('room-dismissed');
        // --- Added Here: रूम की जानकारी को डिलीट करें ---
        if (rooms[roomId]) {
            delete rooms[roomId];
        }
    });

    // Jab koi user disconnect ho jaye
    socket.on('disconnect', () => {
        console.log('User Disconnected:', socket.id);
        const roomId = socket.room;

        // --- Added Here: Disconnect होने पर गिनती कम करें ---
        if (roomId && rooms[roomId]) {
            rooms[roomId].delete(socket.id);
            // अगर रूम खाली हो गया है, तो उसे डिलीट कर दें
            if (rooms[roomId].size === 0) {
                delete rooms[roomId];
            }
        }
        
        // --- Changed Here: सिर्फ उसी रूम के लोगों को बताएं ---
        io.to(roomId).emit('user-left', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Leo Connect Hub Active`));
