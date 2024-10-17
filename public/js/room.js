// \webrtc\public\js\room.js

(async function() {
    // Function to load modal HTML files
    async function loadModal(url, containerId) {
        try {
            const response = await fetch(url);
            const html = await response.text();
            document.getElementById(containerId).innerHTML = html;
        } catch (error) {
            console.error('Error loading modal:', error);
        }
    }

    // Load modals
    await loadModal('infor_user.html', 'infor_user_container');

    // Now the modal is loaded, proceed with the rest of the code

    const createRoomButton = document.getElementById('createRoomButton');
    const confirmRoomButton = document.getElementById('confirmRoomButton');
    const roomNameInput = document.getElementById('roomName');
    const roomTableBody = document.getElementById('roomTableBody');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const logoutButton = document.getElementById('logoutButton');
    const userInfoButton = document.getElementById('userInfoButton');
    const modalUsername = document.getElementById('modalUsername');
    const modalEmail = document.getElementById('modalEmail');

    // Lấy username từ localStorage
    const username = localStorage.getItem('username');
    if (!username) {
        window.location.href = 'login.html'; // Chuyển về trang đăng nhập nếu chưa có username
    } else {
        usernameDisplay.innerText = username; // Hiển thị username lên giao diện
    }

    // Tạo kết nối với server qua Socket.io
    const socket = io('https://localhost:3000');

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

    // Hàm để join vào phòng
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

})();
