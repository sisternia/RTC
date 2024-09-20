// \webrtc\public\js\chat.js

// Gán sự kiện cho tab Chat và Users
chatTab.classList.add('active');
messages.style.display = 'block';
document.getElementById('chat-controls').style.display = 'flex'; // Hiển thị chat controls khi ở tab Chat

chatTab.addEventListener('click', () => {
    messages.style.display = 'block';
    userList.style.display = 'none';
    document.getElementById('chat-controls').style.display = 'flex'; // Hiển thị chat controls khi ở tab Chat
    chatTab.classList.add('active');
    userTab.classList.remove('active');
});

userTab.addEventListener('click', () => {
    messages.style.display = 'none';
    userList.style.display = 'block';
    document.getElementById('chat-controls').style.display = 'none'; // Ẩn chat controls khi ở tab Users
    chatTab.classList.remove('active');
    userTab.classList.add('active');
});

// Gửi tin nhắn khi nhấn nút "Gửi"
sendMessageButton.addEventListener('click', sendMessage);

// Lắng nghe sự kiện khi nhấn phím trong ô nhập tin nhắn
messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        // Ngăn chặn xuống dòng nếu không bấm Shift
        event.preventDefault();
        sendMessage();
    } else if (event.key === 'Enter' && event.shiftKey) {
        // Cho phép xuống dòng nếu bấm Shift+Enter
        event.stopPropagation();
    }
});

socket.on('message', (data) => {
    const messageElement = document.createElement('div');

    if (data.from !== 'System') { // Tin nhắn của người dùng
        const usernameElement = document.createElement('strong'); // Hiển thị tên người dùng
        usernameElement.textContent = `${data.from}:`;

        const textElement = document.createElement('p'); // Hiển thị nội dung tin nhắn trên dòng mới
        textElement.textContent = data.text;

        messageElement.appendChild(usernameElement); // Thêm tên người dùng vào khối tin nhắn
        messageElement.appendChild(textElement); // Thêm nội dung tin nhắn vào khối tin nhắn

    } else { // Thông báo hệ thống
        messageElement.textContent = `${data.from}: ${data.text}`; // Hiển thị thông báo trên cùng một dòng
    }

    messages.appendChild(messageElement); // Thêm tin nhắn vào khối chứa tin nhắn
    messages.scrollTop = messages.scrollHeight;  // Tự động cuộn xuống cuối cùng
});


// Hàm gửi tin nhắn
function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('message', message);
        messageInput.value = '';
    }
}