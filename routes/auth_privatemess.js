// \webrtc\routes\auth_privatemess.js
const express = require('express');
const router = express.Router();
const PrivateMessage = require('../models/PrivateMess');
const multer = require('multer');
const path = require('path');

// Configure multer to store files in the 'uploads' directory with unique filenames
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const originalName = file.originalname;
        const extension = path.extname(originalName);
        const baseName = path.basename(originalName, extension);
        const newFileName = baseName + '-' + uniqueSuffix + extension;
        cb(null, newFileName);
    }
});

const upload = multer({ storage: storage });

// Save a text message or file
router.post('/private-messages', upload.single('file'), async (req, res) => {
    const { content, user_sent, user_receive, type, size, date_sent } = req.body;
    const file = req.file;

    try {
        let savedMessage;
        if (type === 'file') {
            // Lưu tên file gốc vào content, tên file đã đổi vào filename
            const originalName = file.originalname;
            const newMessage = new PrivateMessage({
                content: originalName,
                user_sent,
                user_receive,
                type: 'file',
                size: (file.size / 1024).toFixed(2) + ' KB',
                status: 0,
                date_sent: date_sent || new Date(),
                date_seen: null,
                filename: file.filename // Tên file duy nhất trên server
            });
            savedMessage = await newMessage.save();
            res.status(200).json({
                success: true, 
                message: 'Message has been saved', 
                data: { 
                    content: savedMessage.content,
                    filename: savedMessage.filename
                }
            });
        } else {
            const newMessage = new PrivateMessage({
                content: content,
                user_sent,
                user_receive,
                type: 'text',
                size: size || null,
                status: 0,
                date_sent: date_sent || new Date(),
                date_seen: null
            });
            savedMessage = await newMessage.save();
            res.status(200).json({
                success: true, 
                message: 'Message has been saved', 
                data: { content: savedMessage.content }
            });
        }

    } catch (error) {
        console.error('Error saving private message:', error);
        res.status(500).json({ success: false, message: 'Error saving message' });
    }
});

// Mark messages as seen
router.put('/private-messages/mark-as-seen', async (req, res) => {
    const { user_sent, user_receive } = req.body;
    try {
        await PrivateMessage.updateMany(
            {
                user_sent,
                user_receive,
                status: 0
            },
            {
                $set: {
                    status: 1,
                    date_seen: new Date()
                }
            }
        );
        res.status(200).json({ success: true, message: 'Messages marked as seen' });
    } catch (error) {
        console.error('Error marking messages as seen:', error);
        res.status(500).json({ success: false, message: 'Error marking messages as seen' });
    }
});

// Get messages between two users
router.get('/private-messages', async (req, res) => {
    const { user1, user2 } = req.query;
    try {
        const messages = await PrivateMessage.find({
            $or: [
                { user_sent: user1, user_receive: user2 },
                { user_sent: user2, user_receive: user1 }
            ]
        }).sort({ date_sent: 1 });

        res.status(200).json({ success: true, messages });
    } catch (error) {
        console.error('Error retrieving private messages:', error);
        res.status(500).json({ success: false, message: 'Error retrieving messages' });
    }
});

module.exports = router;
