// \webrtc\routes\auth_privatemess.js

const express = require('express');
const router = express.Router();
const PrivateMessage = require('../models/PrivateMess');

// POST /private-messages
// Lưu một tin nhắn riêng tư mới
router.post('/private-messages', async (req, res) => {
    const { content, user_sent, user_receive, date_sent } = req.body;
    try {
        const newMessage = new PrivateMessage({
            content,
            user_sent,
            user_receive,
            status: 0,
            date_sent: date_sent || new Date(),
            date_seen: null
        });
        await newMessage.save();
        res.status(200).json({ success: true, message: 'Tin nhắn đã được lưu' });
    } catch (error) {
        console.error('Lỗi khi lưu tin nhắn riêng tư:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lưu tin nhắn' });
    }
});

// PUT /private-messages/mark-as-seen
// Đánh dấu tin nhắn là đã xem
router.put('/private-messages/mark-as-seen', async (req, res) => {
    const { user_sent, user_receive } = req.body;
    try {
        const result = await PrivateMessage.updateMany(
            {
                user_sent: user_sent, // Tin nhắn được gửi bởi người khác
                user_receive: user_receive, // Nhận bởi tôi
                status: 0 // Chưa xem
            },
            {
                $set: {
                    status: 1, // Đánh dấu là đã xem
                    date_seen: new Date()
                }
            }
        );
        res.status(200).json({ success: true, message: 'Tin nhắn đã được đánh dấu là đã xem' });
    } catch (error) {
        console.error('Lỗi khi đánh dấu tin nhắn đã xem:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi đánh dấu tin nhắn đã xem' });
    }
});

// GET /private-messages
// Lấy tin nhắn giữa hai người dùng
router.get('/private-messages', async (req, res) => {
    const { user1, user2 } = req.query;
    try {
        const messages = await PrivateMessage.find({
            $or: [
                { user_sent: user1, user_receive: user2 },
                { user_sent: user2, user_receive: user1 }
            ]
        }).sort({ date_sent: 1 }); // Sắp xếp tin nhắn theo date_sent tăng dần
        res.status(200).json({ success: true, messages });
    } catch (error) {
        console.error('Lỗi khi lấy tin nhắn riêng tư:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy tin nhắn' });
    }
});

module.exports = router;