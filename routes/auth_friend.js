// routes/auth_friend.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Friend = require('../models/Friend');

// Gửi lời mời kết bạn
router.post('/add-friend', async (req, res) => {
    const { requesterUsername, recipientUsername } = req.body;

    if (requesterUsername === recipientUsername) {
        return res.json({ success: false, message: 'Bạn không thể kết bạn với chính mình' });
    }

    try {
        const requester = await User.findOne({ username: requesterUsername });
        const recipient = await User.findOne({ username: recipientUsername });

        if (!recipient) {
            return res.json({ success: false, message: 'Người dùng không tồn tại' });
        }

        // Kiểm tra xem mối quan hệ đã tồn tại chưa
        const existingFriend = await Friend.findOne({
            $or: [
                { requester: requester._id, recipient: recipient._id },
                { requester: recipient._id, recipient: requester._id }
            ]
        });

        if (existingFriend) {
            if (existingFriend.status === 3) {
                return res.json({ success: false, message: 'Đã là bạn bè' });
            } else if (existingFriend.status === 1) {
                return res.json({ success: false, message: 'Đã gửi lời mời kết bạn' });
            } else if (existingFriend.status === 2) {
                return res.json({ success: false, message: 'Đã nhận được lời mời kết bạn' });
            }
        }

        const newFriendRequest = new Friend({
            requester: requester._id,
            recipient: recipient._id,
            status: 1 // Đã gửi lời mời kết bạn
        });
        await newFriendRequest.save();

        res.json({ success: true, message: 'Đã gửi lời mời kết bạn' });

    } catch (error) {
        res.json({ success: false, message: 'Lỗi khi gửi lời mời kết bạn' });
    }
});

// Chấp nhận lời mời kết bạn
router.post('/accept-friend', async (req, res) => {
    const { requesterUsername, recipientUsername } = req.body;

    try {
        const requester = await User.findOne({ username: requesterUsername });
        const recipient = await User.findOne({ username: recipientUsername });

        const friendRequest = await Friend.findOne({
            requester: requester._id,
            recipient: recipient._id,
            status: 1
        });

        if (friendRequest) {
            friendRequest.status = 3; // Đã là bạn bè
            await friendRequest.save();
            res.json({ success: true, message: 'Đã chấp nhận lời mời kết bạn' });
        } else {
            res.json({ success: false, message: 'Không tìm thấy lời mời kết bạn' });
        }

    } catch (error) {
        res.json({ success: false, message: 'Lỗi khi chấp nhận lời mời kết bạn' });
    }
});

// Hủy lời mời kết bạn hoặc hủy kết bạn
router.post('/cancel-friend', async (req, res) => {
    const { requesterUsername, recipientUsername } = req.body;

    try {
        const requester = await User.findOne({ username: requesterUsername });
        const recipient = await User.findOne({ username: recipientUsername });

        const friendship = await Friend.findOneAndDelete({
            $or: [
                { requester: requester._id, recipient: recipient._id },
                { requester: recipient._id, recipient: requester._id }
            ]
        });

        if (friendship) {
            res.json({ success: true, message: 'Đã hủy kết bạn' });
        } else {
            res.json({ success: false, message: 'Không tìm thấy mối quan hệ bạn bè' });
        }

    } catch (error) {
        res.json({ success: false, message: 'Lỗi khi hủy kết bạn' });
    }
});

// Lấy danh sách bạn bè
router.get('/friends', async (req, res) => {
    const { username } = req.query;

    try {
        const user = await User.findOne({ username });

        const friendships = await Friend.find({
            $or: [
                { requester: user._id },
                { recipient: user._id }
            ],
            status: 3 // Chỉ lấy những người đã là bạn
        }).populate('requester recipient', 'username');

        const friends = friendships.map(friendship => {
            if (friendship.requester._id.equals(user._id)) {
                return friendship.recipient.username;
            } else {
                return friendship.requester.username;
            }
        });

        res.json({ success: true, friends });
    } catch (error) {
        res.json({ success: false, message: 'Lỗi khi lấy danh sách bạn bè' });
    }
});

// Lấy lời mời kết bạn nhận được
router.get('/friend-requests', async (req, res) => {
    const { username } = req.query;

    try {
        const user = await User.findOne({ username });

        const requests = await Friend.find({
            recipient: user._id,
            status: 1
        }).populate('requester', 'username');

        const friendRequests = requests.map(request => request.requester.username);

        res.json({ success: true, friendRequests });
    } catch (error) {
        res.json({ success: false, message: 'Lỗi khi lấy lời mời kết bạn' });
    }
});

// Lấy lời mời kết bạn đã gửi
router.get('/sent-requests', async (req, res) => {
    const { username } = req.query;

    try {
        const user = await User.findOne({ username });

        const requests = await Friend.find({
            requester: user._id,
            status: 1
        }).populate('recipient', 'username');

        const sentRequests = requests.map(request => request.recipient.username);

        res.json({ success: true, sentRequests });
    } catch (error) {
        res.json({ success: false, message: 'Lỗi khi lấy lời mời đã gửi' });
    }
});

// Kiểm tra trạng thái kết bạn
router.get('/check-friend-status', async (req, res) => {
    const { username, otherUsername } = req.query;

    try {
        const user = await User.findOne({ username });
        const otherUser = await User.findOne({ username: otherUsername });

        const friendship = await Friend.findOne({
            $or: [
                { requester: user._id, recipient: otherUser._id },
                { requester: otherUser._id, recipient: user._id }
            ]
        });

        if (friendship) {
            if (friendship.status === 3) {
                return res.json({ success: true, status: 'friends' });
            } else if (friendship.status === 1) {
                if (friendship.requester.equals(user._id)) {
                    return res.json({ success: true, status: 'requested' }); // Đã gửi lời mời
                } else {
                    return res.json({ success: true, status: 'pending' }); // Nhận được lời mời
                }
            }
        } else {
            return res.json({ success: true, status: 'none' });
        }
    } catch (error) {
        res.json({ success: false, message: 'Lỗi khi kiểm tra trạng thái kết bạn' });
    }
});

module.exports = router;
