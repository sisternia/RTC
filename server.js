// \webrtc\server.js

const express = require('express');
const https = require('https'); // Sử dụng https thay vì http
const fs = require('fs'); // Để đọc các file chứng chỉ SSL
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth'); // Import route xác thực người dùng

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
app.use('/', authRoutes);
app.get('/user-info', authRoutes);

// Logic cho Socket
let users = {}; // Danh sách các người dùng kết nối với roomId
let rooms = {}; // Danh sách các phòng và số lượng người dùng trong mỗi phòng

io.on('connection', (socket) => {
    console.log(`[${new Date().toLocaleString()}] Người dùng đã kết nối:`, socket.id);

    // Khi một người dùng đã sẵn sàng
    socket.on('ready', async ({ username, roomId }) => {
        socket.username = username;
        socket.roomId = roomId;
        users[socket.id] = { username, roomId };

        if (!rooms[roomId]) {
            rooms[roomId] = { roomName: roomId, creator: username, users: 0 };
        }
        rooms[roomId].users += 1;

        socket.join(roomId); // Tham gia vào roomId tương ứng
        console.log(`[${new Date().toLocaleString()}] ${username} đã tham gia phòng ${roomId}`);

        io.to(roomId).emit('user-ready', { userId: socket.id, username: socket.username });
        io.to(roomId).emit('message', { from: 'System', text: `${socket.username} đã kết nối.` });

        io.emit('room-list', getRooms()); // Gửi danh sách phòng và số lượng người dùng cho tất cả các client

        // Gửi danh sách người dùng trong cùng phòng
        const usersInRoom = Object.values(users).filter(user => user.roomId === roomId);
        io.to(roomId).emit('user-list', usersInRoom.map(user => user.username));
    });

    // Tạo phòng mới
    socket.on('create-room', (data) => {
        rooms[data.roomId] = { roomName: data.roomName, creator: data.username, users: 0 };
        console.log(`[${new Date().toLocaleString()}] Phòng ${data.roomName} đã được tạo bởi ${data.username}`);
        io.emit('room-list', getRooms()); // Gửi danh sách phòng đến tất cả người dùng
    });

    // Lấy danh sách phòng
    socket.on('get-rooms', () => {
        socket.emit('room-list', getRooms()); // Gửi danh sách phòng khi người dùng kết nối
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
    socket.on('leave-room', () => {
        const roomId = users[socket.id]?.roomId;
        if (roomId && rooms[roomId]) {
            rooms[roomId].users -= 1;
            if (rooms[roomId].users <= 0) {
                delete rooms[roomId];
            }
        }
        socket.leave(roomId);
        console.log(`[${new Date().toLocaleString()}] ${socket.username} đã rời khỏi phòng ${roomId}`);
        delete users[socket.id]; // Xóa người dùng khỏi danh sách
        io.to(roomId).emit('message', { from: 'System', text: `${socket.username} đã rời khỏi phòng.` });
        io.emit('room-list', getRooms()); // Cập nhật danh sách phòng
        io.to(roomId).emit('user-list', Object.values(users).filter(user => user.roomId === roomId).map(user => user.username)); // Gửi lại danh sách người dùng cho client
        io.to(roomId).emit('user-disconnected', socket.id);
    });

    // Xử lý sự kiện ngắt kết nối
    socket.on('disconnect', () => {
        console.log(`[${new Date().toLocaleString()}] Người dùng đã ngắt kết nối:`, socket.id);
        const roomId = users[socket.id]?.roomId;
        if (roomId && rooms[roomId]) {
            rooms[roomId].users -= 1;
            if (rooms[roomId].users <= 0) {
                delete rooms[roomId];
            }
        }
        delete users[socket.id]; // Xóa người dùng khỏi danh sách
        io.to(roomId).emit('message', { from: 'System', text: `${socket.username} đã ngắt kết nối.` });
        io.emit('room-list', getRooms()); // Cập nhật danh sách phòng
        io.to(roomId).emit('user-list', Object.values(users).filter(user => user.roomId === roomId).map(user => user.username)); // Gửi lại danh sách người dùng cho client
        io.to(roomId).emit('user-disconnected', socket.id);
    });
});

// Hàm lấy danh sách phòng
function getRooms() {
    return Object.keys(rooms).map(roomId => ({
        roomId,
        roomName: rooms[roomId].roomName,
        username: rooms[roomId].creator,
        users: rooms[roomId].users
    }));
}

// Khởi động server tại cổng 3000
server.listen(3000, () => {
    console.log(`[${new Date().toLocaleString()}] Server đang chạy tại: https://localhost:3000/login.html`);
});
