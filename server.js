// \webrtc\server.js

const express = require('express');
const https = require('https'); 
const fs = require('fs'); 
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const authAccount = require('./routes/auth_account');
const authFriendRoutes = require('./routes/auth_friend');
const authPrivateMessRoutes = require('./routes/auth_privatemess');
const Room = require('./models/Room');
const path = require('path');

const app = express();

// Read SSL certificate files created by OpenSSL
const options = {
    key: fs.readFileSync('ssl/key.pem'),
    cert: fs.readFileSync('ssl/cert.pem')
};

// Create HTTPS server
const server = https.createServer(options, app);
const io = socketIo(server);

// Middleware to serve static files from uploads directory and set file download headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, filePath) => {
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    }
}));
app.use(express.static('public')); // Serve static files from 'public' directory
app.use(express.json()); // Middleware to parse JSON from request bodies

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/webrtc', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log(`[${new Date().toLocaleString()}] Đã kết nối thành công với MongoDB`))
    .catch((err) => console.log(`[${new Date().toLocaleString()}] Lỗi kết nối đến MongoDB:`, err));

// Use routes for registration, login, and user information
app.use('/', authAccount);
app.use('/', authFriendRoutes);
app.use('/', authPrivateMessRoutes);
app.get('/user-info', authAccount);
app.get('/search-users', authAccount);
app.get('/autocomplete-users', authAccount);

// Socket logic
let users = {}; // Map between socket.id and user information
let userSockets = {}; // Map between username and socket.id

// Make io and userSockets accessible to routes
app.set('io', io);
app.set('userSockets', userSockets);

io.on('connection', (socket) => {
    console.log(`[${new Date().toLocaleString()}] Người dùng đã kết nối:`, socket.id);

    // Receive username from client
    socket.on('set-username', (username) => {
        socket.username = username;
        users[socket.id] = { username };
        userSockets[username] = socket.id;
        console.log(`[${new Date().toLocaleString()}] Username set: ${username}`);
    });

    // When a user is ready
    socket.on('ready', async ({ username, roomId }) => {
        socket.username = username;
        socket.roomId = roomId;
        users[socket.id] = { username, roomId };
        userSockets[username] = socket.id;

        try {
            // Find room in the database
            const room = await Room.findOne({ room_id: roomId });
            if (room) {
                room.users += 1;
                await room.save();
            } else {
                // If room doesn't exist (rare case), create a new room
                const newRoom = new Room({
                    room_id: roomId,
                    room_name: roomId,
                    username: username,
                    users: 1
                });
                await newRoom.save();
            }
        } catch (error) {
            console.error(`[${new Date().toLocaleString()}] Lỗi khi cập nhật phòng:`, error);
        }

        socket.join(roomId); // Join the corresponding roomId
        console.log(`[${new Date().toLocaleString()}] ${username} đã tham gia phòng ${roomId}`);

        io.to(roomId).emit('user-ready', { userId: socket.id, username: socket.username });
        io.to(roomId).emit('message', { from: 'System', text: `${socket.username} đã kết nối.` });

        io.emit('room-list', await getRooms()); // Send room list and user counts to all clients

        // Send list of users in the same room
        const usersInRoom = Object.values(users).filter(user => user.roomId === roomId);
        io.to(roomId).emit('user-list', usersInRoom.map(user => user.username));
    });

    // Create a new room
    socket.on('create-room', async (data) => {
        try {
            const room = new Room({
                room_id: data.roomId,
                room_name: data.roomName,
                username: data.username,
                users: 0
            });
            await room.save();
            console.log(`[${new Date().toLocaleString()}] Phòng ${data.roomName} đã được tạo bởi ${data.username}`);
            io.emit('room-list', await getRooms()); // Send room list to all users
        } catch (error) {
            console.error(`[${new Date().toLocaleString()}] Lỗi khi tạo phòng:`, error);
        }
    });

    // Get room list
    socket.on('get-rooms', async () => {
        socket.emit('room-list', await getRooms()); // Send room list when user connects
    });

    // Handle WebRTC signaling
    socket.on('signal', (data) => {
        io.to(data.to).emit('signal', {
            signal: data.signal,
            from: socket.id,
            username: socket.username // Send username for display
        });
    });

    // Handle messages in the room
    socket.on('message', (message) => {
        io.to(socket.roomId).emit('message', {
            from: socket.username, // Display with username
            text: message
        });
    });

    // Handle audio messages
    socket.on('audio-message', (audio) => {
        io.to(socket.roomId).emit('audio-message', {
            from: socket.username, // Display with username
            audio: audio
        });
    });

    // Handle camera toggle
    socket.on('toggle-camera', (cameraEnabled) => {
        io.to(socket.roomId).emit('toggle-camera', {
            userId: socket.id,
            cameraEnabled: cameraEnabled,
            username: socket.username // Send username for display
        });
        console.log(`[${new Date().toLocaleString()}] ${socket.username} đã ${cameraEnabled ? 'bật' : 'tắt'} camera`);
    });

    // Handle microphone toggle
    socket.on('toggle-mic', (micEnabled) => {
        io.to(socket.roomId).emit('toggle-mic', {
            userId: socket.id,
            micEnabled: micEnabled,
            username: socket.username // Send username for display
        });
        console.log(`[${new Date().toLocaleString()}] ${socket.username} đã ${micEnabled ? 'bật' : 'tắt'} microphone`);
    });

    // Handle user leaving the room
    socket.on('leave-room', async () => {
        const roomId = users[socket.id]?.roomId;
        if (roomId) {
            try {
                const room = await Room.findOne({ room_id: roomId });
                if (room) {
                    room.users -= 1;
                    if (room.users <= 0) {
                        await Room.deleteOne({ room_id: roomId });
                    } else {
                        await room.save();
                    }
                }
            } catch (error) {
                console.error(`[${new Date().toLocaleString()}] Lỗi khi cập nhật phòng:`, error);
            }
        }
        socket.leave(roomId);
        console.log(`[${new Date().toLocaleString()}] ${socket.username} đã rời khỏi phòng ${roomId}`);
        delete users[socket.id];
        delete userSockets[socket.username];
        io.to(roomId).emit('message', { from: 'System', text: `${socket.username} đã rời khỏi phòng.` });
        io.emit('room-list', await getRooms()); // Update room list
        io.to(roomId).emit('user-list', Object.values(users).filter(user => user.roomId === roomId).map(user => user.username)); // Send updated user list to client
        io.to(roomId).emit('user-disconnected', socket.id);
    });

    // Handle disconnect event
    socket.on('disconnect', async () => {
        console.log(`[${new Date().toLocaleString()}] Người dùng đã ngắt kết nối:`, socket.id);
        const roomId = users[socket.id]?.roomId;
        if (roomId) {
            try {
                const room = await Room.findOne({ room_id: roomId });
                if (room) {
                    room.users -= 1;
                    if (room.users <= 0) {
                        await Room.deleteOne({ room_id: roomId });
                    } else {
                        await room.save();
                    }
                }
            } catch (error) {
                console.error(`[${new Date().toLocaleString()}] Lỗi khi cập nhật phòng:`, error);
            }
        }
        delete userSockets[socket.username];
        delete users[socket.id];
        io.to(roomId).emit('message', { from: 'System', text: `${socket.username} đã ngắt kết nối.` });
        io.emit('room-list', await getRooms()); // Update room list
        io.to(roomId).emit('user-list', Object.values(users).filter(user => user.roomId === roomId).map(user => user.username)); // Send updated user list to client
        io.to(roomId).emit('user-disconnected', socket.id);
    });

    // Handle joining private chat room
    socket.on('join-private-room', (data) => {
        socket.join(data.roomId);
        console.log(`[${new Date().toLocaleString()}] ${socket.username} đã tham gia phòng chat riêng tư ${data.roomId}`);
    });

    socket.on('private-message', async (data) => {
        const toUsername = data.to;
        const message = data.message;
        const fromUsername = socket.username;
        const type = data.type || 'text';
        const size = data.size || null;
        const dateSent = data.date_sent || new Date().toISOString();

        const toSocketId = userSockets[toUsername];
        if (toSocketId && toSocketId !== socket.id) {
            io.to(toSocketId).emit('private-message', {
                from: fromUsername,
                to: toUsername,
                message: message,
                date_sent: dateSent,
                type: type,
                size: size
            });
        }
    });

    // Listen for messages-seen event
    socket.on('messages-seen', (data) => {
        const senderUsername = data.to;
        const recipientUsername = data.from;

        const senderSocketId = userSockets[senderUsername];
        if (senderSocketId && senderSocketId !== socket.id) {
            io.to(senderSocketId).emit('messages-seen', {
                from: recipientUsername
            });
        }
    });

});

// Function to get room list
async function getRooms() {
    try {
        const rooms = await Room.find({});
        return rooms.map(room => ({
            roomId: room.room_id,
            roomName: room.room_name,
            username: room.username,
            users: room.users
        }));
    } catch (error) {
        console.error(`[${new Date().toLocaleString()}] Lỗi khi lấy danh sách phòng:`, error);
        return [];
    }
}

// Start server on port 3000
server.listen(3000, () => {
    console.log(`[${new Date().toLocaleString()}] Server đang chạy tại: https://localhost:3000/login.html`);
});
