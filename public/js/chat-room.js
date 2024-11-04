// \webrtc\public\js\chat.js

// Gán sự kiện cho tab Chat và Users
let lastSender = ''; // Biến lưu trữ tên người gửi tin nhắn trước
let lastTime = '';   // Biến lưu trữ thời gian của tin nhắn trước

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
    // Lấy thời gian hiện tại
    const currentTime = new Date();
    const hours = currentTime.getHours().toString().padStart(2, '0');
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');
    const timestamp = `[${hours}:${minutes}]`;

    // Kiểm tra nếu tin nhắn là từ chính người dùng (Client này)
    const sender = data.from === socket.username ? 'You' : data.from;

    if (data.from !== 'System') { // Tin nhắn của người dùng
        // Kiểm tra xem có phải cùng người gửi và cùng thời gian hay không
        if (sender !== lastSender || timestamp !== lastTime) {
            // Tạo thẻ div mới nếu khác người gửi hoặc khác thời gian
            const messageElement = document.createElement('div');
            const usernameElement = document.createElement('strong'); // Hiển thị tên người dùng và thời gian
            usernameElement.textContent = `${timestamp} ${sender}:`;
            
            messageElement.appendChild(usernameElement); // Thêm tên người dùng và thời gian vào khối tin nhắn
            messages.appendChild(messageElement); // Thêm tin nhắn vào khối chứa tin nhắn
        }
        
        // Luôn luôn thêm tin nhắn vào thẻ hiện tại (dù có thay đổi hay không)
        const textElement = document.createElement('p'); // Hiển thị nội dung tin nhắn
        textElement.innerHTML = formatMessageWithLinks(data.text);

        // Thêm nội dung tin nhắn vào khối cuối cùng trong khối chứa tin nhắn
        messages.lastElementChild.appendChild(textElement);

        // Cập nhật người gửi và thời gian cuối cùng
        lastSender = sender;
        lastTime = timestamp;

    } else { // Thông báo hệ thống
        const messageElement = document.createElement('div');
        messageElement.textContent = `${timestamp} ${data.from}: ${data.text}`; // Hiển thị thông báo hệ thống
        messages.appendChild(messageElement); // Thêm thông báo hệ thống
    }

    messages.scrollTop = messages.scrollHeight;  // Tự động cuộn xuống cuối cùng
});

// Hàm định dạng tin nhắn với hyperlink
function formatMessageWithLinks(message) {
    const urlRegex = /((https?:\/\/[^\s]+))/g;
    return message.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
}

// Hàm gửi tin nhắn
function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('message', message);
        messageInput.value = '';
    }
}
