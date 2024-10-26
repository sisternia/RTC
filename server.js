// \webrtc\server.js
const express = require('express');
const https = require('https'); // Sử dụng https thay vì http
const fs = require('fs'); // Để đọc các file chứng chỉ SSL
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const authAccount = require('./routes/auth_account');
const authFriendRoutes = require('./routes/auth_friend');
const authPrivateMessRoutes = require('./routes/auth_privatemess');
const Room = require('./models/Room');

const app = express();

// Đọc các file chứng chỉ SSL do OpenSSL tạo
const options = {
    key: fs.readFileSync('ssl/key.pem'),
    cert: fs.readFileSync('ssl/cert.pem')
};

// Tạo server HTTPS
const server = https.createServer(options, app);
const io = socketIo(server);

app.use(express.static('public')); // Sử dụng thư mục 'public' để phục vụ các file tĩnh
app.use(express.json()); // Middleware để phân tích cú pháp JSON từ body của các request

// Kết nối đến MongoDB
mongoose.connect('mongodb://localhost:27017/webrtc', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log(`[${new Date().toLocaleString()}] Đã kết nối thành công với MongoDB`))
    .catch((err) => console.log(`[${new Date().toLocaleString()}] Lỗi kết nối đến MongoDB:`, err));

// Sử dụng route để đăng ký, đăng nhập, lấy thông tin người dùng
app.use('/', authAccount);
app.use('/', authFriendRoutes);
app.use('/', authPrivateMessRoutes);
app.get('/user-info', authAccount);
app.get('/search-users', authAccount);
app.get('/autocomplete-users', authAccount);

// Logic cho Socket
let users = {}; // Map giữa socket.id và thông tin người dùng
let userSockets = {}; // Map giữa username và socket.id

io.on('connection', (socket) => {
    console.log(`[${new Date().toLocaleString()}] Người dùng đã kết nối:`, socket.id);

    // Nhận username từ client
    socket.on('set-username', (username) => {
        socket.username = username;
        users[socket.id] = { username };
        userSockets[username] = socket.id;
        console.log(`[${new Date().toLocaleString()}] Username set: ${username}`);
    });

    // Khi một người dùng đã sẵn sàng
    socket.on('ready', async ({ username, roomId }) => {
        socket.username = username;
        socket.roomId = roomId;
        users[socket.id] = { username, roomId };
        userSockets[username] = socket.id;

        try {
            // Tìm phòng trong cơ sở dữ liệu
            const room = await Room.findOne({ room_id: roomId });
            if (room) {
                room.users += 1;
                await room.save();
            } else {
                // Nếu phòng không tồn tại (trường hợp hiếm), tạo phòng mới
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

        socket.join(roomId); // Tham gia vào roomId tương ứng
        console.log(`[${new Date().toLocaleString()}] ${username} đã tham gia phòng ${roomId}`);

        io.to(roomId).emit('user-ready', { userId: socket.id, username: socket.username });
        io.to(roomId).emit('message', { from: 'System', text: `${socket.username} đã kết nối.` });

        io.emit('room-list', await getRooms()); // Gửi danh sách phòng và số lượng người dùng cho tất cả các client

        // Gửi danh sách người dùng trong cùng phòng
        const usersInRoom = Object.values(users).filter(user => user.roomId === roomId);
        io.to(roomId).emit('user-list', usersInRoom.map(user => user.username));
    });

    // Tạo phòng mới
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
            io.emit('room-list', await getRooms()); // Gửi danh sách phòng đến tất cả người dùng
        } catch (error) {
            console.error(`[${new Date().toLocaleString()}] Lỗi khi tạo phòng:`, error);
        }
    });

    // Lấy danh sách phòng
    socket.on('get-rooms', async () => {
        socket.emit('room-list', await getRooms()); // Gửi danh sách phòng khi người dùng kết nối
    });

    // Xử lý tín hiệu WebRTC
    socket.on('signal', (data) => {
        io.to(data.to).emit('signal', {
            signal: data.signal,
            from: socket.id,
            username: socket.username // Gửi username để hiển thị
        });
    });

    // Xử lý tin nhắn trong phòng
    socket.on('message', (message) => {
        io.to(socket.roomId).emit('message', {
            from: socket.username, // Hiển thị với username
            text: message
        });
    });

    // Xử lý tin nhắn âm thanh
    socket.on('audio-message', (audio) => {
        io.to(socket.roomId).emit('audio-message', {
            from: socket.username, // Hiển thị với username
            audio: audio
        });
    });

    // Xử lý việc bật/tắt camera
    socket.on('toggle-camera', (cameraEnabled) => {
        io.to(socket.roomId).emit('toggle-camera', {
            userId: socket.id,
            cameraEnabled: cameraEnabled,
            username: socket.username // Gửi username để hiển thị
        });
        console.log(`[${new Date().toLocaleString()}] ${socket.username} đã ${cameraEnabled ? 'bật' : 'tắt'} camera`);
    });

    // Xử lý việc bật/tắt microphone
    socket.on('toggle-mic', (micEnabled) => {
        io.to(socket.roomId).emit('toggle-mic', {
            userId: socket.id,
            micEnabled: micEnabled,
            username: socket.username // Gửi username để hiển thị
        });
        console.log(`[${new Date().toLocaleString()}] ${socket.username} đã ${micEnabled ? 'bật' : 'tắt'} microphone`);
    });

    // Xử lý người dùng rời khỏi phòng
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
        delete users[socket.id]; // Xóa người dùng khỏi danh sách
        delete userSockets[socket.username];
        io.to(roomId).emit('message', { from: 'System', text: `${socket.username} đã rời khỏi phòng.` });
        io.emit('room-list', await getRooms()); // Cập nhật danh sách phòng
        io.to(roomId).emit('user-list', Object.values(users).filter(user => user.roomId === roomId).map(user => user.username)); // Gửi lại danh sách người dùng cho client
        io.to(roomId).emit('user-disconnected', socket.id);
    });

    // Xử lý sự kiện ngắt kết nối
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
        delete users[socket.id]; // Xóa người dùng khỏi danh sách
        io.to(roomId).emit('message', { from: 'System', text: `${socket.username} đã ngắt kết nối.` });
        io.emit('room-list', await getRooms()); // Cập nhật danh sách phòng
        io.to(roomId).emit('user-list', Object.values(users).filter(user => user.roomId === roomId).map(user => user.username)); // Gửi lại danh sách người dùng cho client
        io.to(roomId).emit('user-disconnected', socket.id);
    });

    // Xử lý tham gia phòng chat riêng tư
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

    // Lắng nghe sự kiện messages-seen
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

// Hàm lấy danh sách phòng
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

// Khởi động server tại cổng 3000
server.listen(3000, () => {
    console.log(`[${new Date().toLocaleString()}] Server đang chạy tại: https://localhost:3000/login.html`);
});
