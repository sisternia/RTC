// \webrtc\public\js\socket-connection.js

const socket = io('https://localhost:3000');

// Khi nhận sự kiện 'user-ready', lưu tên người dùng của chính Client vào socket.username
socket.on('user-ready', (data) => {
    if (data.userId === socket.id) {
        socket.username = data.username; // Lưu tên người dùng hiện tại
        return;
    }

    // Phần còn lại giữ nguyên như trước
    const peer = new SimplePeer({
        initiator: true, // Người dùng này là người khởi tạo kết nối
        trickle: false,  // Truyền tín hiệu từng bước (trickle) không được sử dụng
        stream: localStream // Truyền luồng stream cục bộ (video/audio)
    });

    peer.on('signal', signal => {
        socket.emit('signal', { to: data.userId, signal }); // Gửi tín hiệu WebRTC tới người dùng khác qua socket
    });

    peer.on('stream', stream => {
        addRemoteVideo(data.userId, data.username, stream); // Hiển thị video của người dùng khác
    });

    peers[data.userId] = peer; // Lưu đối tượng peer vào danh sách các peer
});


// Khi nhận tín hiệu từ người dùng khác
socket.on('signal', data => {
    if (data.from === socket.id) return;

    if (!peers[data.from]) {
        const peer = new SimplePeer({
            initiator: false, // Người dùng này không phải là người khởi tạo kết nối
            trickle: false,  // Không sử dụng truyền tín hiệu từng bước
            stream: localStream // Truyền luồng stream cục bộ
        });

        peer.on('signal', signal => {
            socket.emit('signal', { to: data.from, signal }); // Gửi tín hiệu phản hồi
        });

        peer.on('stream', stream => {
            addRemoteVideo(data.from, data.username, stream); // Hiển thị video của người dùng khác
        });

        peers[data.from] = peer; // Lưu peer mới vào danh sách các peer
    }
    peers[data.from].signal(data.signal); // Gửi tín hiệu WebRTC tới peer
});

// Khi một người dùng ngắt kết nối
socket.on('user-disconnected', userId => {
    if (peers[userId]) {
        peers[userId].destroy(); // Hủy đối tượng peer khi người dùng ngắt kết nối
        delete peers[userId]; // Xóa peer khỏi danh sách
    }

    const remoteVideoContainer = document.getElementById(`video-container-${userId}`);
    if (remoteVideoContainer) {
        remoteVideoContainer.remove(); // Xóa khối chứa video của người dùng
    }
});

// Khi người dùng bật/tắt camera
socket.on('toggle-camera', (data) => {
    const remoteVideo = document.getElementById(`video-${data.userId}`);
    if (remoteVideo) {
        if (data.cameraEnabled) {
            remoteVideo.classList.remove('black-screen'); // Hiển thị video nếu camera bật
        } else {
            remoteVideo.classList.add('black-screen'); // Hiển thị màn hình đen nếu camera tắt
        }
    }
});

// Khi người dùng bật/tắt microphone
socket.on('toggle-mic', (data) => {
    console.log(`Người dùng ${data.username} đã ${data.micEnabled ? 'bật' : 'tắt'} microphone của họ.`);
});

// Cập nhật danh sách người dùng trong phòng
socket.on('user-list', (users) => {
    userList.innerHTML = ''; // Xóa danh sách cũ
    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.textContent = user;
        userList.appendChild(userItem); // Thêm người dùng vào danh sách
    });
});

// Xử lý khi rời khỏi phòng
socket.on('leave-room', () => {
    socket.disconnect(); // Ngắt kết nối socket
    window.location.href = 'room.html'; // Chuyển về trang quản lý phòng
});

