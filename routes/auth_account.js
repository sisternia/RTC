// \webrtc\routes\auth_account.js
const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Verify = require('../models/Verify');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Cấu hình nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'vu784512000@gmail.com',
        pass: 'ehuh wxze qoaj nzwa'
    }
});

router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.json({ success: false, message: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        // Tạo mã xác thực 6 chữ số
        const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

        const verify = new Verify({
            user: newUser._id,
            verify_code: verifyCode,
            verify_status: '0'
        });
        await verify.save();

        const mailOptions = {
            from: 'your_email@gmail.com',
            to: email,
            subject: 'Account Verification',
            text: `Your verification code is: ${verifyCode}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return res.json({ success: false, message: 'Error sending email' });
            } else {
                res.json({ success: true, message: 'User registered successfully. Verification email sent.' });
            }
        });
    } catch (error) {
        res.json({ success: false, message: 'Error registering user' });
    }
});

router.post('/verify', async (req, res) => {
    const { username, verify_code } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        const verification = await Verify.findOne({ user: user._id });
        if (!verification) {
            return res.json({ success: false, message: 'No verification code found' });
        }

        if (verification.verify_code === verify_code) {
            verification.verify_status = '1';
            await verification.save();
            return res.json({ success: true, message: 'Account verified successfully' });
        } else {
            return res.json({ success: false, message: 'Invalid verification code' });
        }
    } catch (error) {
        res.json({ success: false, message: 'Error verifying code' });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.json({ success: false, message: 'Missing username or password' });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        const verification = await Verify.findOne({ user: user._id });
        if (verification && verification.verify_status === '0') {
            return res.json({ success: false, message: 'Account not verified. Please verify your account first.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.json({ success: false, message: 'Invalid password' });
        }

        res.json({ success: true, message: 'Login successful' });
    } catch (error) {
        res.json({ success: false, message: 'Error logging in' });
    }
});

router.get('/user-info', async (req, res) => {
    const { username } = req.query;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                username: user.username,
                email: user.email,
                avatar: user.avatar || ''
            }
        });
    } catch (error) {
        res.json({ success: false, message: 'Error fetching user info' });
    }
});

router.post('/reset-password', async (req, res) => {
    const { username, email } = req.body;

    try {
        const user = await User.findOne({ username, email });
        if (!user) {
            return res.json({ success: false, message: 'Invalid username or email' });
        }

        const newPassword = Math.random().toString(36).slice(-8) + '!';
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        const mailOptions = {
            from: 'your_email@gmail.com',
            to: email,
            subject: 'Password Reset',
            text: `Your new password is: ${newPassword}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return res.json({ success: false, message: 'Error sending email' });
            } else {
                res.json({ success: true, message: 'New password sent successfully.' });
            }
        });
    } catch (error) {
        res.json({ success: false, message: 'Error resetting password' });
    }
});

router.post('/change-password', async (req, res) => {
    const { username, oldPassword, newPassword } = req.body;

    if (!username || !oldPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin cần thiết' });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
        }

        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: 'Mật khẩu cũ không đúng' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedNewPassword;
        await user.save();

        return res.status(200).json({ success: true, message: 'Đổi mật khẩu thành công' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi khi đổi mật khẩu' });
    }
});

router.get('/autocomplete-users', async (req, res) => {
    const { query } = req.query;
    if (!query) {
        return res.json({ success: false, message: 'Thiếu chuỗi tìm kiếm' });
    }

    try {
        const users = await User.find(
            { username: { $regex: query, $options: 'i' } },
            'username -_id'
        ).limit(10);

        res.json({ success: true, users });
    } catch (error) {
        res.json({ success: false, message: 'Lỗi khi tìm kiếm người dùng' });
    }
});

router.get('/search-users', async (req, res) => {
    const { query } = req.query;
    if (!query) {
        return res.json({ success: false, message: 'Thiếu chuỗi tìm kiếm' });
    }

    try {
        const users = await User.find({
            username: { $regex: query, $options: 'i' }
        }, 'username -_id');

        res.json({ success: true, users });
    } catch (error) {
        res.json({ success: false, message: 'Lỗi khi tìm kiếm người dùng' });
    }
});

// Route upload-avatar
router.post('/upload-avatar', async (req, res) => {
    const { username, image } = req.body;
    if (!username || !image) {
        return res.json({ success: false, message: 'Thiếu thông tin cần thiết' });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.json({ success: false, message: 'Người dùng không tồn tại' });
        }

        // image là base64, decode ra buffer
        const matches = image.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
        if (!matches) {
            return res.json({ success: false, message: 'Dữ liệu ảnh không hợp lệ' });
        }
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const data = matches[2];
        const buffer = Buffer.from(data, 'base64');

        // Tạo tên file unique
        const filename = `avatar_${username}_${Date.now()}.${ext}`;
        const imgPath = path.join(__dirname, '../img', filename);

        fs.writeFile(imgPath, buffer, async (err) => {
            if (err) {
                console.error('Lỗi khi ghi file ảnh:', err);
                return res.json({ success: false, message: 'Lỗi khi lưu ảnh' });
            }

            // Cập nhật user.avatar
            user.avatar = filename;
            await user.save();

            return res.json({ success: true, message: 'Cập nhật avatar thành công', filename });
        });
    } catch (error) {
        console.error('Lỗi upload avatar:', error);
        return res.json({ success: false, message: 'Lỗi server khi upload avatar' });
    }
});

module.exports = router;
