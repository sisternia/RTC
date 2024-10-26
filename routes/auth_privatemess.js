const express = require('express');
const router = express.Router();
const PrivateMessage = require('../models/PrivateMess');
const multer = require('multer');
const path = require('path');

// Configure multer to store files in the 'uploads' directory
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Use original filename without prefix
    }
});

const upload = multer({ storage: storage });

// Save a text message or file
router.post('/private-messages', upload.single('file'), async (req, res) => {
    const { content, user_sent, user_receive, type, size, date_sent } = req.body;
    const file = req.file;

    try {
        // Create a new message document based on file type
        const newMessage = new PrivateMessage({
            content: type === 'file' ? file.filename : content,
            user_sent,
            user_receive,
            type,
            size: type === 'file' ? (file.size / 1024).toFixed(2) + ' KB' : size,
            status: 0,
            date_sent: date_sent || new Date(),
            date_seen: null
        });

        await newMessage.save();
        res.status(200).json({ success: true, message: 'Message has been saved' });
    } catch (error) {
        console.error('Error saving private message:', error);
        res.status(500).json({ success: false, message: 'Error saving message' });
    }
});

// Mark messages as seen
router.put('/private-messages/mark-as-seen', async (req, res) => {
    const { user_sent, user_receive } = req.body;
    try {
        const result = await PrivateMessage.updateMany(
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
