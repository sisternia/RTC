// models/Friend.js
const mongoose = require('mongoose');

const FriendSchema = new mongoose.Schema({
    requester: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }, // Người gửi lời mời kết bạn
    recipient: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }, // Người nhận lời mời kết bạn
    status: {
        type: Number,
        enums: [
            0, // 'add friend' - Chưa có mối quan hệ
            1, // 'requested' - Đã gửi lời mời kết bạn
            2, // 'pending' - Đã nhận lời mời kết bạn
            3  // 'friends' - Đã là bạn bè
        ]
    }
}, { timestamps: true });

module.exports = mongoose.model('Friend', FriendSchema);
