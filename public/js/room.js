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
        window.location.href = 'login.html'; 
    } else {
        document.getElementById('usernameDisplay').innerText = username; 
    }

    const socket = io('https://localhost:3000');
    socket.emit('set-username', username);
    window.socket = socket;
    window.username = username;

    // Tải giao diện chat
    await loadContent('chat_user.html', 'chatUserContainer');
    await loadScript('js/chat-user.js');

    const createRoomButton = document.getElementById('createRoomButton');
    const confirmRoomButton = document.getElementById('confirmRoomButton');
    const roomNameInput = document.getElementById('roomName');
    const roomCardContainer = document.getElementById('roomCardContainer');
    const logoutButton = document.getElementById('logoutButton');

    const roomTypeNoPassword = document.getElementById('roomTypeNoPassword');
    const roomTypePassword = document.getElementById('roomTypePassword');
    const passwordFieldContainer = document.getElementById('passwordFieldContainer');
    const roomPasswordInput = document.getElementById('roomPassword');

    const enterRoomPasswordModal = new bootstrap.Modal(document.getElementById('enterRoomPasswordModal'));
    const checkRoomPasswordButton = document.getElementById('checkRoomPasswordButton');
    const inputRoomPassword = document.getElementById('inputRoomPassword');
    const wrongPasswordAlert = document.getElementById('wrongPasswordAlert');

    // Hiển thị hoặc ẩn trường mật khẩu khi chọn radio
    roomTypeNoPassword.addEventListener('change', () => {
        if (roomTypeNoPassword.checked) {
            passwordFieldContainer.style.display = 'none';
        }
    });
    roomTypePassword.addEventListener('change', () => {
        if (roomTypePassword.checked) {
            passwordFieldContainer.style.display = 'block';
        }
    });

    createRoomButton.addEventListener('click', () => {
        const roomModal = new bootstrap.Modal(document.getElementById('roomModal'));
        roomModal.show(); 
    });

    confirmRoomButton.addEventListener('click', () => {
        const roomName = roomNameInput.value.trim();
        const isPasswordProtected = roomTypePassword.checked;
        const passwordValue = isPasswordProtected ? roomPasswordInput.value.trim() : null;

        if (!roomName) {
            alert('Vui lòng nhập tên phòng');
            return;
        }
        if (isPasswordProtected && !passwordValue) {
            alert('Vui lòng nhập mật khẩu phòng');
            return;
        }

        const roomId = Math.floor(100000 + Math.random() * 900000).toString(); 
        socket.emit('create-room', { roomId, roomName, username, isPasswordProtected, password: passwordValue });
        roomNameInput.value = '';
        roomPasswordInput.value = '';
        const roomModal = bootstrap.Modal.getInstance(document.getElementById('roomModal'));
        roomModal.hide();
        // Tham gia phòng trực tiếp, bỏ qua việc kiểm tra mật khẩu vì đây là người tạo
        joinRoomIfPossible(roomId, true);
    });

    // Hàm kiểm tra phòng có mật khẩu không, nếu có hiển thị modal yêu cầu nhập mật khẩu
    async function joinRoomIfPossible(roomId, skipPasswordCheck = false) {
        if (skipPasswordCheck) {
            // Bỏ qua kiểm tra mật khẩu
            localStorage.setItem('roomId', roomId);
            window.location.href = `index.html?roomId=${roomId}`;
            return;
        }
        
        // Kiểm tra thông tin phòng
        const roomInfo = await getRoomInfo(roomId);
        if (roomInfo && roomInfo.isPasswordProtected) {
            // Hiển thị modal nhập mật khẩu
            inputRoomPassword.value = '';
            wrongPasswordAlert.style.display = 'none';
            enterRoomPasswordModal.show();

            checkRoomPasswordButton.onclick = async () => {
                const enteredPassword = inputRoomPassword.value.trim();
                if (!enteredPassword) {
                    alert('Vui lòng nhập mật khẩu');
                    return;
                }
                const result = await verifyRoomPassword(roomId, enteredPassword);
                if (result) {
                    enterRoomPasswordModal.hide();
                    localStorage.setItem('roomId', roomId);
                    window.location.href = `index.html?roomId=${roomId}`;
                } else {
                    wrongPasswordAlert.style.display = 'block';
                }
            };
        } else {
            // Phòng không có mật khẩu
            localStorage.setItem('roomId', roomId);
            window.location.href = `index.html?roomId=${roomId}`;
        }
    }

    // Hàm lấy thông tin phòng từ room-list
    async function getRoomInfo(roomId) {
        return new Promise((resolve) => {
            socket.emit('get-rooms');
            socket.once('room-list', (rooms) => {
                const room = rooms.find(r => r.roomId === roomId);
                resolve(room);
            });
        });
    }

    // Hàm verify mật khẩu phòng
    async function verifyRoomPassword(roomId, password) {
        const response = await fetch('/verify-room-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, password })
        });
        const data = await response.json();
        return data.success === true;
    }

    // Hàm join room từ giao diện card phòng
    window.joinRoom = function(roomId) {
        joinRoomIfPossible(roomId);
    };

    // Nhận danh sách phòng từ server
    socket.on('room-list', (rooms) => {
        roomCardContainer.innerHTML = '';
        rooms.forEach(room => {
            const cardCol = document.createElement('div');
            cardCol.className = 'col-md-4';
    
            const card = document.createElement('div');
            card.className = 'card room-card';
    
            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';
    
            const roomInfo = document.createElement('div');
            roomInfo.className = 'room-info';
    
            const roomId = document.createElement('div');
            roomId.className = 'info-item';
            roomId.innerHTML = `<strong>ID:</strong> ${room.roomId}`;
    
            const lockIcon = room.isPasswordProtected ? `<i class="bi bi-lock"></i>` : `<i class="bi bi-unlock"></i>`;
            const roomName = document.createElement('div');
            roomName.className = 'info-item';
            roomName.innerHTML = `<strong>Phòng:</strong> ${room.roomName} ${lockIcon}`;
    
            roomInfo.appendChild(roomId);
            roomInfo.appendChild(roomName);
    
            const roomCreator = document.createElement('p');
            roomCreator.className = 'card-text';
            roomCreator.innerHTML = `<strong>Người Tạo:</strong> ${room.username}`;
    
            const roomUsers = document.createElement('p');
            roomUsers.className = 'card-text';
            roomUsers.innerHTML = `<strong>Số Người:</strong> ${room.users}`;
    
            const joinButton = document.createElement('button');
            joinButton.className = 'btn btn-primary';
            joinButton.textContent = 'Vào phòng';
            joinButton.addEventListener('click', () => joinRoom(room.roomId));
    
            cardBody.appendChild(roomInfo);
            cardBody.appendChild(roomCreator);
            cardBody.appendChild(roomUsers);
            cardBody.appendChild(joinButton);
    
            card.appendChild(cardBody);
            cardCol.appendChild(card);
            roomCardContainer.appendChild(cardCol);
        });
    });
    

    socket.emit('get-rooms');

    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('username');
        window.location.href = 'login.html';
    });

})();
