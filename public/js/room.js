// \webrtc\public\js\room.js

(async function() {
    // Hàm tải nội dung HTML vào một container
    async function loadContent(url, containerId) {
        try {
            const response = await fetch(url);
            const html = await response.text();
            document.getElementById(containerId).innerHTML = html;
        } catch (error) {
            console.error('Lỗi khi tải nội dung:', error);
        }
    }

    // Hàm tải một tệp JavaScript một cách động
    function loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Không thể tải script ${url}`));
            document.body.appendChild(script);
        });
    }

    // Tải các modal
    await loadContent('infor_user.html', 'infor_user_container');

    // Lấy username từ localStorage
    const username = localStorage.getItem('username');
    if (!username) {
        window.location.href = 'login.html'; // Chuyển về trang đăng nhập nếu chưa có username
    } else {
        document.getElementById('usernameDisplay').innerText = username; // Hiển thị username lên giao diện
    }

    // Tạo kết nối với server qua Socket.io
    const socket = io('https://localhost:3000');

    // Thông báo cho server về username
    socket.emit('set-username', username);

    // Làm cho socket và username có thể truy cập từ các script khác
    window.socket = socket;
    window.username = username;

    // Tải giao diện chat
    await loadContent('chat_user.html', 'chatUserContainer');

    // Sau khi giao diện chat được tải, tải script chat-user.js
    await loadScript('js/chat-user.js');

    // Tiếp tục với phần code còn lại
    const createRoomButton = document.getElementById('createRoomButton');
    const confirmRoomButton = document.getElementById('confirmRoomButton');
    const roomNameInput = document.getElementById('roomName');
    const roomTableBody = document.getElementById('roomTableBody');
    const logoutButton = document.getElementById('logoutButton');
    const userInfoButton = document.getElementById('userInfoButton');
    const modalUsername = document.getElementById('modalUsername');
    const modalEmail = document.getElementById('modalEmail');
    const changePasswordButton = document.getElementById('changePasswordButton');
    const confirmChangePasswordButton = document.getElementById('confirmChangePasswordButton');

    // Sự kiện tạo phòng
    createRoomButton.addEventListener('click', () => {
        const roomModal = new bootstrap.Modal(document.getElementById('roomModal'));
        roomModal.show(); // Hiển thị modal khi bấm nút tạo phòng
    });

    // Xác nhận tạo phòng và gửi dữ liệu lên server
    confirmRoomButton.addEventListener('click', () => {
        const roomName = roomNameInput.value;
        if (roomName) {
            const roomId = Math.floor(100000 + Math.random() * 900000).toString(); // Tạo ID phòng ngẫu nhiên
            socket.emit('create-room', { roomId, roomName, username });
            roomNameInput.value = ''; // Reset input
            const roomModal = bootstrap.Modal.getInstance(document.getElementById('roomModal'));
            roomModal.hide(); // Ẩn modal sau khi tạo phòng
            joinRoom(roomId); // Tự động tham gia vào phòng sau khi tạo
        } else {
            alert('Vui lòng nhập tên phòng');
        }
    });

    // Nhận danh sách phòng từ server và hiển thị
    socket.on('room-list', (rooms) => {
        roomTableBody.innerHTML = ''; // Xóa danh sách cũ
        rooms.forEach(room => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="text-align: center; vertical-align: middle;">${room.roomId}</td>
                <td style="text-align: center; vertical-align: middle;">${room.roomName}</td>
                <td style="text-align: center; vertical-align: middle;">${room.username}</td>
                <td style="text-align: center; vertical-align: middle;">${room.users}</td>
                <td style="text-align: center; vertical-align: middle;"><button class="btn btn-primary" onclick="joinRoom('${room.roomId}')">Vào phòng</button></td>
            `;
            roomTableBody.appendChild(row);
        });
    });

    // Hàm để tham gia vào phòng
    window.joinRoom = function(roomId) {
        localStorage.setItem('roomId', roomId); // Lưu roomId vào localStorage
        window.location.href = `index.html?roomId=${roomId}`;
    };

    // Khi kết nối với server
    socket.emit('get-rooms');

    // Xử lý đăng xuất
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('username'); // Xóa username khỏi localStorage
        window.location.href = 'login.html'; // Chuyển về trang đăng nhập
    });

    // Sự kiện hiển thị thông tin người dùng
    userInfoButton.addEventListener('click', async () => {
        try {
            const response = await fetch(`/user-info?username=${username}`);
            const data = await response.json();
            if (data.success) {
                modalUsername.value = data.user.username;
                modalEmail.value = data.user.email;
                const userInfoModal = new bootstrap.Modal(document.getElementById('userInfoModal'));
                userInfoModal.show(); // Hiển thị modal với thông tin người dùng
            } else {
                alert('Không thể lấy thông tin người dùng');
            }
        } catch (error) {
            alert('Lỗi khi lấy thông tin người dùng: ' + error.message);
        }
    });

    // Khi bấm vào nút Đổi mật khẩu
    changePasswordButton.addEventListener('click', () => {
        const userInfoModal = bootstrap.Modal.getInstance(document.getElementById('userInfoModal'));
        userInfoModal.hide(); // Ẩn modal Thông tin User
        const changePasswordModal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
        changePasswordModal.show(); // Hiển thị modal Đổi mật khẩu
    });

    // Khi bấm nút Xác nhận đổi mật khẩu
    confirmChangePasswordButton.addEventListener('click', async () => {
        const oldPassword = document.getElementById('oldPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;

        // Kiểm tra mật khẩu mới và xác nhận mật khẩu
        if (newPassword !== confirmNewPassword) {
            alert('Mật khẩu mới và xác nhận mật khẩu không khớp.');
            return;
        }

        try {
            const username = localStorage.getItem('username'); // Lấy username từ localStorage
            const response = await fetch('/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, oldPassword, newPassword })
            });

            const result = await response.json();
            if (result.success) {
                alert('Đổi mật khẩu thành công');
                const changePasswordModal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
                changePasswordModal.hide(); // Ẩn modal Đổi mật khẩu
            } else {
                alert(result.message || 'Đổi mật khẩu thất bại');
            }
        } catch (error) {
            alert('Lỗi khi đổi mật khẩu: ' + error.message);
        }
    });

    // Hàm xử lý bật/tắt hiển thị mật khẩu
    function togglePasswordVisibility(inputId, iconId) {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);
        if (input.type === 'password') {
            input.type = 'text'; // Hiển thị mật khẩu
            icon.classList.remove('bi-eye-slash');
            icon.classList.add('bi-eye');
        } else {
            input.type = 'password'; // Ẩn mật khẩu
            icon.classList.remove('bi-eye');
            icon.classList.add('bi-eye-slash');
        }
    }

    // Gán sự kiện cho các nút bật/tắt hiển thị mật khẩu
    document.getElementById('toggleOldPassword').addEventListener('click', () => {
        togglePasswordVisibility('oldPassword', 'toggleOldPassword');
    });

    document.getElementById('toggleNewPassword').addEventListener('click', () => {
        togglePasswordVisibility('newPassword', 'toggleNewPassword');
    });

    document.getElementById('toggleConfirmPassword').addEventListener('click', () => {
        togglePasswordVisibility('confirmNewPassword', 'toggleConfirmPassword');
    });

})();

