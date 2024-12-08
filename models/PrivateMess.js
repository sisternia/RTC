// \webrtc\models\PrivateMess.js

const mongoose = require('mongoose');

const PrivateMessageSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true
    },
    user_sent: {
        type: String,
        required: true
    },
    user_receive: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['text', 'file'],
        default: 'text'
    },
    size: {
        type: String,
        default: null
    },
    status: {
        type: Number,
        default: 0 // 0: not seen, 1: seen
    },
    date_sent: {
        type: Date,
        default: Date.now
    },
    date_seen: {
        type: Date,
        default: null
    },
    filename: {
        type: String,
        default: null // Lưu tên file đã đổi trên server
    }
});

module.exports = mongoose.model('PrivateMessage', PrivateMessageSchema);

