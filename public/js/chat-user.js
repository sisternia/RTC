// \webrtc\public\js\chat-user.js

(async function() {
    // Truy cập username và socket từ đối tượng window toàn cục
    const username = window.username;
    const socket = window.socket;

    // Đảm bảo socket đã được khởi tạo
    if (!socket) {
        console.error('Socket.io chưa được khởi tạo.');
        return;
    }

    // Chức năng chat
    let currentChatFriend = null;

    const chatContainer = document.getElementById('chatContainer');
    const chatFriendName = document.getElementById('chatFriendName');
    const chatBox = document.getElementById('chatBox'); // Bây giờ là textarea
    const chatInput = document.getElementById('chatInput');
    const sendMessageButton = document.getElementById('sendMessageButton');
    const closeChat = document.getElementById('closeChat');

    // Hàm mở chat với một người bạn
    window.openChat = async function(friendUsername) {
        currentChatFriend = friendUsername;
        chatFriendName.innerText = `Chat với ${friendUsername}`; // Tiêu đề cố định
        chatBox.innerHTML = '';
        chatContainer.style.display = 'flex';

        // Tham gia một phòng riêng với bạn
        const roomId = [username, friendUsername].sort().join('_');
        socket.emit('join-private-room', { roomId });

        // Tải lịch sử chat
        try {
            const response = await fetch(`/private-messages?user1=${username}&user2=${friendUsername}`);
            const data = await response.json();
            if (data.success) {
                // Hiển thị tin nhắn
                data.messages.forEach(message => {
                    const dateSent = new Date(message.date_sent);
                    displayMessage(message.user_sent, message.content, dateSent, message._id, message.status.toString());
                });

            } else {
                console.error('Lỗi khi tải lịch sử chat');
            }
        } catch (error) {
            console.error('Lỗi khi lấy lịch sử chat:', error);
        }
    };

    // Lấy và hiển thị danh sách bạn bè
    async function loadFriendList() {
        try {
            const response = await fetch(`/friends?username=${username}`);
            const data = await response.json();
            if (data.success) {
                const friendList = document.getElementById('friendList'); // Lấy phần tử friendList
                friendList.innerHTML = ''; // Xóa danh sách hiện tại
                data.friends.forEach(friendUsername => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item d-flex justify-content-between align-items-center';
                    li.innerText = friendUsername;
                    li.style.cursor = 'pointer';
                    // Thêm sự kiện click để mở chat
                    li.addEventListener('click', () => {
                        openChat(friendUsername);
                    });
                    friendList.appendChild(li);
                });
            } else {
                alert('Không thể lấy danh sách bạn bè');
            }
        } catch (error) {
            console.error('Lỗi khi lấy danh sách bạn bè:', error);
        }
    }

    // Gọi loadFriendList khi script được tải
    loadFriendList();

    // Đóng chat
    closeChat.addEventListener('click', () => {
        chatContainer.style.display = 'none';
        currentChatFriend = null;
    });

    // Gửi tin nhắn
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (message === '') return;

        const dateSent = new Date();

        // Hiển thị tin nhắn trong khung chat của mình
        displayMessage(username, message, dateSent, null, '0');

        // Gửi tin nhắn đến server
        socket.emit('private-message', {
            to: currentChatFriend,
            message: message,
            date_sent: dateSent.toISOString()
        });

        // Lưu tin nhắn vào cơ sở dữ liệu
        try {
            const response = await fetch('/private-messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: message,
                    user_sent: username,
                    user_receive: currentChatFriend,
                    date_sent: dateSent.toISOString()
                })
            });
            const data = await response.json();
            if (!data.success) {
                console.error('Lỗi khi lưu tin nhắn:', data.message);
            }
        } catch (error) {
            console.error('Lỗi khi lưu tin nhắn:', error);
        }

        // Xóa nội dung trong trường nhập
        chatInput.value = '';
        chatInput.style.height = 'auto'; // Đặt lại chiều cao
    }

    sendMessageButton.addEventListener('click', sendMessage);

    chatInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Ngăn xuống dòng
            sendMessage();
        }
    });

    // Tự động điều chỉnh chiều cao của textarea lên đến 4 dòng
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        const maxHeight = parseInt(window.getComputedStyle(this).getPropertyValue('max-height'));
        const scrollHeight = this.scrollHeight;
        if (scrollHeight > maxHeight) {
            this.style.height = maxHeight + 'px';
        } else {
            this.style.height = scrollHeight + 'px';
        }
    });

    // Hiển thị tin nhắn trong khung chat
    function displayMessage(sender, message, dateSent, messageId = null, status = '0') {
        const messageContainer = document.createElement('div');
        messageContainer.className = 'message-container';

        // Định dạng dateSent thành giờ-phút
        const date = new Date(dateSent);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const timeString = `${hours}:${minutes}`;

        // Phần tử thời gian, ban đầu ẩn
        const timeElement = document.createElement('div');
        timeElement.className = 'time';
        timeElement.textContent = timeString;
        timeElement.style.display = 'none';

        // Phần tử tin nhắn
        const messageElement = document.createElement('div');
        messageElement.className = 'message';

        // Nội dung tin nhắn
        const textElement = document.createElement('div');
        textElement.className = 'text';
        // Sử dụng textContent để tránh XSS và giữ xuống dòng
        textElement.textContent = message;

        messageElement.appendChild(textElement);

        // Xác định tin nhắn từ mình hay người khác
        if (sender === username) {
            messageElement.classList.add('self');
            messageContainer.classList.add('self-container');
            // Lưu messageId và status trong dataset
            messageElement.dataset.messageId = messageId;
            messageElement.dataset.status = status;
        } else {
            messageElement.classList.add('other');
            messageContainer.classList.add('other-container');
        }

        // Thêm sự kiện click để hiển thị thời gian và cuộn vào khung nhìn
        messageElement.addEventListener('click', () => {
            if (timeElement.style.display === 'none') {
                if (sender === username) {
                    // Hiển thị "Đã xem" hoặc "Chưa xem"
                    const statusText = messageElement.dataset.status === '1' ? 'Đã xem' : 'Chưa xem';
                    timeElement.textContent = `${timeString} - ${statusText}`;
                } else {
                    timeElement.textContent = timeString;
                }
                timeElement.style.display = 'block';
            } else {
                timeElement.style.display = 'none';
            }
            // Cuộn tin nhắn vào khung nhìn
            messageContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });

        // Gắn các phần tử vào message container
        messageContainer.appendChild(timeElement);
        messageContainer.appendChild(messageElement);

        // Thêm message container vào đầu chat box để hiển thị từ dưới lên
        chatBox.insertBefore(messageContainer, chatBox.firstChild);
    }

    // Hàm đánh dấu tin nhắn đã xem
    async function markMessagesAsSeen() {
        if (!currentChatFriend) return; // Không làm gì nếu không có bạn chat hiện tại
        try {
            const response = await fetch('/private-messages/mark-as-seen', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_sent: currentChatFriend,
                    user_receive: username
                })
            });
            const data = await response.json();
            if (!data.success) {
                console.error('Lỗi khi đánh dấu tin nhắn đã xem:', data.message);
            } else {
                // Sau khi đánh dấu tin nhắn là đã xem, gửi sự kiện qua Socket.io
                socket.emit('messages-seen', {
                    from: username,
                    to: currentChatFriend
                });
            }
        } catch (error) {
            console.error('Lỗi khi đánh dấu tin nhắn đã xem:', error);
        }
    }

    // Thêm sự kiện focus vào trường nhập để đánh dấu tin nhắn đã xem khi người dùng tập trung vào nó
    chatInput.addEventListener('focus', markMessagesAsSeen);

    // Nhận tin nhắn riêng tư
    socket.on('private-message', (data) => {
        if (data.from === username) {
            return; // Không xử lý tin nhắn do chính mình gửi
        }

        // Kiểm tra xem cửa sổ chat với người gửi đã mở chưa
        if (currentChatFriend !== data.from) {
            // Mở cửa sổ chat với người gửi
            openChat(data.from);

        } else {
            // Hiển thị tin nhắn đến
            const dateSent = data.date_sent ? new Date(data.date_sent) : new Date();
            displayMessage(data.from, data.message, dateSent, null, '0');
        }
    });

    // Lắng nghe sự kiện messages-seen
    socket.on('messages-seen', (data) => {
        const recipientUsername = data.from;

        if (currentChatFriend !== recipientUsername) {
            return; // Không làm gì nếu không chat với người này
        }

        // Cập nhật trạng thái của các tin nhắn đã gửi
        const messageElements = document.querySelectorAll('.message.self');

        messageElements.forEach((messageElement) => {
            messageElement.dataset.status = '1'; // Đánh dấu là đã xem
        });
    });

})();