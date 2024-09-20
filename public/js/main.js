// \webrtc\public\js\main.js

const localVideo = document.getElementById('localVideo');
const remoteVideos = document.getElementById('remoteVideos');
const messageInput = document.getElementById('messageInput');
const sendMessageButton = document.getElementById('sendMessage');
const toggleCameraButton = document.getElementById('toggleCamera');
const toggleMicButton = document.getElementById('toggleMic');
const startRecordingButton = document.getElementById('startRecording');
const leaveRoomButton = document.getElementById('leaveRoom'); // Nút thoát phòng
const messages = document.getElementById('messages');
const userList = document.getElementById('user-list');
const chatTab = document.getElementById('chatTab');
const userTab = document.getElementById('userTab');
const localUserLabel = document.getElementById('localUserLabel');

// Lấy username và roomId từ localStorage
const username = localStorage.getItem('username');
const roomId = localStorage.getItem('roomId');

if (!username || !roomId) {
    window.location.href = 'login.html'; // Chuyển về trang đăng nhập nếu chưa có username hoặc roomId
}

localUserLabel.textContent = username;

// Sự kiện khi bấm nút thoát khỏi phòng
leaveRoomButton.addEventListener('click', () => {
    socket.emit('leave-room');
    localStorage.removeItem('roomId'); // Xóa roomId khỏi localStorage
    window.location.href = 'room.html'; // Quay lại trang quản lý phòng
});