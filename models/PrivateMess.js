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
    }
});

module.exports = mongoose.model('PrivateMessage', PrivateMessageSchema);
