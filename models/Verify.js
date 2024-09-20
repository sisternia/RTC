// \webrtc\models\Verify.js
const mongoose = require('mongoose');

const VerifySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    verify_code: {
        type: String,
        required: true
    },
    verify_status: {
        type: String,
        default: '0' // Mặc định là chưa xác thực
    }
});

module.exports = mongoose.model('Verify', VerifySchema);
