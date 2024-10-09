// \webrtc\public\js\room.js
// (Các biến và sự kiện đã có giữ nguyên)
const createRoomButton = document.getElementById('createRoomButton');
const confirmRoomButton = document.getElementById('confirmRoomButton');
const roomNameInput = document.getElementById('roomName');
const roomTableBody = document.getElementById('roomTableBody');
const usernameDisplay = document.getElementById('usernameDisplay');
const logoutButton = document.getElementById('logoutButton');
const userInfoButton = document.getElementById('userInfoButton');
const modalUsername = document.getElementById('modalUsername');
const modalEmail = document.getElementById('modalEmail');

// Các biến cho tính năng tìm kiếm
const searchUserButton = document.getElementById('searchUserButton');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const searchResults = document.getElementById('searchResults');
const autocompleteList = document.getElementById('autocompleteList');
const closeSearchModalButton = document.getElementById('closeSearchModalButton');

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
function joinRoom(roomId) {
    localStorage.setItem('roomId', roomId); // Lưu roomId vào localStorage
    window.location.href = `index.html?roomId=${roomId}`;
}

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
            document.getElementById('modalUsername').value = data.user.username;
            document.getElementById('modalEmail').value = data.user.email;
            const userInfoModal = new bootstrap.Modal(document.getElementById('userInfoModal'));
            userInfoModal.show(); // Hiển thị modal với thông tin người dùng
        } else {
            alert('Không thể lấy thông tin người dùng');
        }
    } catch (error) {
        alert('Lỗi khi lấy thông tin người dùng: ' + error.message);
    }
});

// Xử lý sự kiện "Tìm kiếm"
searchUserButton.addEventListener('click', () => {
    searchInput.value = ''; // Reset input
    searchResults.innerHTML = ''; // Xóa kết quả cũ
    autocompleteList.innerHTML = ''; // Xóa danh sách gợi ý
    const searchUserModal = new bootstrap.Modal(document.getElementById('searchUserModal'));
    searchUserModal.show(); // Hiển thị modal tìm kiếm
});

// Xử lý khi nhập vào ô tìm kiếm
searchInput.addEventListener('input', async () => {
    const searchQuery = searchInput.value.trim();
    if (searchQuery) {
        try {
            const response = await fetch(`/autocomplete-users?query=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();
            if (data.success) {
                displayAutocompleteSuggestions(data.users);
            } else {
                autocompleteList.innerHTML = '';
            }
        } catch (error) {
            console.error('Lỗi khi tìm kiếm: ', error.message);
            autocompleteList.innerHTML = '';
        }
    } else {
        autocompleteList.innerHTML = '';
    }
});

// Hàm hiển thị danh sách gợi ý
function displayAutocompleteSuggestions(users) {
    autocompleteList.innerHTML = ''; // Xóa danh sách cũ
    if (users.length > 0) {
        users.forEach(user => {
            const suggestionDiv = document.createElement('div');
            suggestionDiv.classList.add('autocomplete-suggestion');
            suggestionDiv.textContent = user.username;
            suggestionDiv.addEventListener('click', () => {
                searchInput.value = user.username;
                autocompleteList.innerHTML = '';
            });
            autocompleteList.appendChild(suggestionDiv);
        });
    } else {
        autocompleteList.innerHTML = '';
    }
}

// Xử lý khi nhấn nút "Xác nhận" trong modal
searchButton.addEventListener('click', async () => {
    const searchQuery = searchInput.value.trim();
    if (searchQuery) {
        try {
            const response = await fetch(`/search-users?query=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();
            if (data.success) {
                displaySearchResults(data.users);
            } else {
                searchResults.innerHTML = `<p>${data.message}</p>`;
            }
        } catch (error) {
            searchResults.innerHTML = `<p>Lỗi khi tìm kiếm: ${error.message}</p>`;
        }
    } else {
        alert('Vui lòng nhập tên người dùng cần tìm');
    }
});

// Hàm hiển thị kết quả tìm kiếm
function displaySearchResults(users) {
    searchResults.innerHTML = ''; // Xóa kết quả cũ
    if (users.length > 0) {
        users.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.classList.add('border', 'p-2', 'mb-2', 'rounded');
            userDiv.innerHTML = `<strong>${user.username}</strong>`;
            searchResults.appendChild(userDiv);
        });
    } else {
        searchResults.innerHTML = '<p>Không tìm thấy người dùng nào.</p>';
    }
}

// Đóng modal tìm kiếm khi nhấn nút "Đóng"
closeSearchModalButton.addEventListener('click', () => {
    searchResults.innerHTML = ''; // Xóa kết quả khi đóng modal
    autocompleteList.innerHTML = ''; // Xóa danh sách gợi ý
});

