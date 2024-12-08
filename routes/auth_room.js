// \webrtc\routes\auth_room.js
const express = require('express');
const router = express.Router();
const Room = require('../models/Room');

// Xác thực mật khẩu phòng
router.post('/verify-room-password', async (req, res) => {
    const { roomId, password } = req.body;

    try {
        const room = await Room.findOne({ room_id: roomId });
        if (!room) {
            return res.json({ success: false, message: 'Không tìm thấy phòng.' });
        }

        if (!room.isPasswordProtected) {
            // Phòng không có mật khẩu
            return res.json({ success: true });
        } else {
            // Kiểm tra mật khẩu
            if (room.password === password) {
                return res.json({ success: true });
            } else {
                return res.json({ success: false, message: 'Mật khẩu không đúng.' });
            }
        }
    } catch (error) {
        console.error(`[${new Date().toLocaleString()}] Lỗi khi kiểm tra mật khẩu phòng:`, error);
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

module.exports = router;
