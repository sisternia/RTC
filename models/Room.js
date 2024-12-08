// \webrtc\models\Room.js
// \webrtc\models\Room.js
const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    room_id: {
        type: String,
        required: true,
        unique: true
    },
    room_name: {
        type: String,
        required: true
    },
    username: { // Tên người tạo phòng, liên kết với bảng users
        type: String,
        required: true
    },
    users: { // Số lượng người dùng trong phòng
        type: Number,
        default: 0
    },
    isPasswordProtected: {
        type: Boolean,
        default: false
    },
    password: {
        type: String,
        default: null
    }
});

module.exports = mongoose.model('Room', RoomSchema);

