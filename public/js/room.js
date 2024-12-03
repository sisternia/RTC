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
    await loadContent('change_pass.html', 'change_pass_container');

    // Tải các script cho các modal
    await loadScript('js/infor_user.js');
    await loadScript('js/change_pass.js');

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

})();
