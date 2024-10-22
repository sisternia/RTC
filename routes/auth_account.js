// \webrtc\routes\auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Verify = require('../models/Verify');
const nodemailer = require('nodemailer');

const router = express.Router();

// Cấu hình nodemailer để gửi email
const transporter = nodemailer.createTransport({
    service: 'gmail', // Sử dụng Gmail
    auth: {
        user: 'vu784512000@gmail.com', // Thay bằng email của bạn
        pass: 'ehuh wxze qoaj nzwa' // Thay bằng mật khẩu email của bạn
    }
});

// Route xử lý đăng ký người dùng
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

        // Tạo mã xác thực 6 chữ số ngẫu nhiên
        const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Lưu mã xác thực và trạng thái vào bảng Verify
        const verify = new Verify({
            user: newUser._id,
            verify_code: verifyCode,
            verify_status: '0'
        });
        await verify.save();

        // Gửi mã xác thực tới email của người dùng
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

// Route xử lý xác thực mã 6 chữ số
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
            verification.verify_status = '1'; // Đặt trạng thái đã xác thực
            await verification.save();
            return res.json({ success: true, message: 'Account verified successfully' });
        } else {
            return res.json({ success: false, message: 'Invalid verification code' });
        }
    } catch (error) {
        res.json({ success: false, message: 'Error verifying code' });
    }
});

// Route xử lý đăng nhập người dùng
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

// Route xử lý lấy thông tin người dùng
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
                email: user.email
            }
        });
    } catch (error) {
        res.json({ success: false, message: 'Error fetching user info' });
    }
});

// Route xử lý quên mật khẩu
router.post('/reset-password', async (req, res) => {
    const { username, email } = req.body;

    try {
        const user = await User.findOne({ username, email });
        if (!user) {
            return res.json({ success: false, message: 'Invalid username or email' });
        }

        // Tạo mật khẩu mới 9 ký tự gồm số, chữ cái và 1 ký tự đặc biệt
        const newPassword = Math.random().toString(36).slice(-8) + '!';

        // Hash mật khẩu mới trước khi lưu
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        // Gửi mật khẩu mới tới email của người dùng
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

// Route xử lý đổi mật khẩu
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

// Route xử lý tự động hoàn thành khi tìm kiếm người dùng
router.get('/autocomplete-users', async (req, res) => {
    const { query } = req.query;
    if (!query) {
        return res.json({ success: false, message: 'Thiếu chuỗi tìm kiếm' });
    }

    try {
        // Tìm kiếm người dùng có username chứa chuỗi tìm kiếm (không phân biệt hoa thường)
        const users = await User.find(
            { username: { $regex: query, $options: 'i' } },
            'username -_id'
        ).limit(10); // Giới hạn số lượng kết quả nếu cần

        res.json({ success: true, users });
    } catch (error) {
        res.json({ success: false, message: 'Lỗi khi tìm kiếm người dùng' });
    }
});

// Route xử lý tìm kiếm người dùng
router.get('/search-users', async (req, res) => {
    const { query } = req.query;
    if (!query) {
        return res.json({ success: false, message: 'Thiếu chuỗi tìm kiếm' });
    }

    try {
        // Tìm kiếm tất cả người dùng có username chứa chuỗi tìm kiếm (không phân biệt hoa thường)
        const users = await User.find({
            username: { $regex: query, $options: 'i' }
        }, 'username -_id');

        res.json({ success: true, users });
    } catch (error) {
        res.json({ success: false, message: 'Lỗi khi tìm kiếm người dùng' });
    }
});

module.exports = router;