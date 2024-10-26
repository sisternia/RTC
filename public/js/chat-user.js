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

    // Biến lưu trữ bạn hiện đang chat và trạng thái mở cửa sổ chat
    let currentChatFriend = null;
    let isChatOpened = false; // Đánh dấu xem chat đã được mở chưa

    // Lấy các phần tử trong giao diện
    const chatContainer = document.getElementById('chatContainer');
    const chatFriendName = document.getElementById('chatFriendName');
    const chatBox = document.getElementById('chatBox'); 
    const chatInput = document.getElementById('chatInput');
    const sendMessageButton = document.getElementById('sendMessageButton');
    const closeChat = document.getElementById('closeChat');
    const fileIcon = document.querySelector('.bi-folder-symlink.icon');
    let selectedFile = null;

    // Sự kiện khi người dùng chọn file để gửi
    fileIcon.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.onchange = (event) => {
            selectedFile = event.target.files[0];
            chatInput.value = selectedFile.name; // Hiển thị tên file trong chatInput
        };
        fileInput.click();
    });

    // Hàm mở cuộc trò chuyện với một người bạn và tải lịch sử tin nhắn
    window.openChat = async function(friendUsername, loadHistory = true) {
        currentChatFriend = friendUsername;
        isChatOpened = true; // Đánh dấu là chat đã mở
        chatFriendName.innerText = `Chat với ${friendUsername}`;
        chatBox.innerHTML = ''; // Xóa nội dung chat hiện tại
        chatContainer.style.display = 'flex'; // Hiển thị giao diện chat

        // Tạo room ID và tham gia vào phòng chat riêng tư
        const roomId = [username, friendUsername].sort().join('_');
        socket.emit('join-private-room', { roomId });

        // Nếu cần, tải lịch sử tin nhắn từ server
        if (loadHistory) {
            try {
                const response = await fetch(`/private-messages?user1=${username}&user2=${friendUsername}`);
                const data = await response.json();
                if (data.success) {
                    // Hiển thị từng tin nhắn từ lịch sử
                    data.messages.forEach(message => {
                        const dateSent = new Date(message.date_sent);
                        displayMessage(
                            message.user_sent,
                            message.content,
                            dateSent,
                            message._id,
                            message.status.toString(),
                            message.type || 'text',
                            message.size || null
                        );
                    });
                } else {
                    console.error('Lỗi khi tải lịch sử chat');
                }
            } catch (error) {
                console.error('Lỗi khi lấy lịch sử chat:', error);
            }
        }
    };

    // Lấy và hiển thị danh sách bạn bè
    async function loadFriendList() {
        try {
            const response = await fetch(`/friends?username=${username}`);
            const data = await response.json();
            if (data.success) {
                const friendList = document.getElementById('friendList'); 
                friendList.innerHTML = ''; // Xóa danh sách hiện tại

                // Thêm từng bạn bè vào danh sách
                data.friends.forEach(friendUsername => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item d-flex justify-content-between align-items-center';
                    li.innerText = friendUsername;
                    li.style.cursor = 'pointer';

                    // Khi click vào tên bạn bè sẽ mở cuộc trò chuyện
                    li.addEventListener('click', () => {
                        if (currentChatFriend !== friendUsername) {
                            openChat(friendUsername, true);
                        }
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

    // Tải danh sách bạn bè khi script được khởi chạy
    loadFriendList();

    // Đóng cuộc trò chuyện khi người dùng nhấn nút đóng
    closeChat.addEventListener('click', () => {
        chatContainer.style.display = 'none';
        currentChatFriend = null;
        isChatOpened = false; // Đặt lại trạng thái mở cửa sổ chat
    });

    // Hàm gửi tin nhắn
    async function sendMessage() {
        if (selectedFile) {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('user_sent', username);
            formData.append('user_receive', currentChatFriend);
            formData.append('type', 'file');
            formData.append('size', (selectedFile.size / 1024).toFixed(2) + ' KB');
            formData.append('date_sent', new Date().toISOString());
    
            // Send file via API
            try {
                const response = await fetch('/private-messages', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (!data.success) {
                    console.error('Lỗi khi lưu tin nhắn:', data.message);
                } else {
                    const filePath = `/uploads/${selectedFile.name}`;
                    displayMessage(username, filePath, new Date(), null, '0', 'file', selectedFile.size);
                    
                    // Emit private message with the file path to the recipient
                    socket.emit('private-message', {
                        to: currentChatFriend,
                        message: filePath,
                        type: 'file',
                        size: (selectedFile.size / 1024).toFixed(2) + ' KB',
                        date_sent: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error('Lỗi khi lưu tin nhắn:', error);
            }
    
            // Reset selectedFile
            selectedFile = null;
            chatInput.value = '';
            return;
        }
        
        // Xử lý tin nhắn văn bản
        const message = chatInput.value.trim();
        if (message === '') return;

        const dateSent = new Date();

        // Hiển thị tin nhắn văn bản ngay lập tức cho người gửi
        displayMessage(username, message, dateSent, null, '0', 'text');

        // Gửi tin nhắn văn bản qua socket
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
                    type: 'text',
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
        chatInput.style.height = 'auto';
    }

    // Sự kiện click để gửi tin nhắn
    sendMessageButton.addEventListener('click', sendMessage);

    // Sự kiện nhấn phím Enter để gửi tin nhắn, Shift + Enter để xuống dòng
    chatInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
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

    // Hàm rút gọn tên file nếu quá dài
    function truncateFileName(fileName, maxLength = 10) {
        const extensionIndex = fileName.lastIndexOf('.');
        if (extensionIndex === -1 || fileName.length <= maxLength) return fileName;

        const namePart = fileName.slice(0, extensionIndex);
        const extensionPart = fileName.slice(extensionIndex);
        return namePart.length > maxLength
            ? `${namePart.slice(0, maxLength - 5)}...${extensionPart}`
            : fileName;
    }

    // Hàm hiển thị tin nhắn trên giao diện
    function displayMessage(sender, message, dateSent, messageId = null, status = '0', type = 'text', size = null) {
        const messageContainer = document.createElement('div');
        messageContainer.className = 'message-container';
    
        const date = new Date(dateSent);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const timeString = `${hours}:${minutes}`;
    
        const timeElement = document.createElement('div');
        timeElement.className = 'time';
        timeElement.textContent = timeString;
        timeElement.style.display = 'none';
    
        const messageElement = document.createElement('div');
    
        if (type === 'file') {
            messageElement.classList.add('file-message-card');
            const fileContainer = document.createElement('div');
            fileContainer.className = 'file-message-card';
            const fileIcon = document.createElement('div');
            fileIcon.className = 'file-icon';
            fileIcon.textContent = message.split('.').pop().toUpperCase();
    
            const fileDetails = document.createElement('div');
            const fileName = document.createElement('div');
            fileName.className = 'file-name';
            fileName.textContent = truncateFileName(message.split('/').pop(), 10);
    
            const fileSize = document.createElement('div');
            fileSize.className = 'file-size';
            fileSize.textContent = size;
    
            fileDetails.appendChild(fileName);
            fileDetails.appendChild(fileSize);
            fileContainer.appendChild(fileIcon);
            fileContainer.appendChild(fileDetails);
    
            const downloadIcon = document.createElement('i');
            downloadIcon.className = 'bi bi-arrow-down-square';
            downloadIcon.style.cursor = 'pointer';
            downloadIcon.title = 'Tải xuống';
            downloadIcon.addEventListener('click', () => {
                downloadFile(message);
            });
    
            messageElement.appendChild(fileContainer);
            messageElement.appendChild(downloadIcon);
        } else {
            messageElement.className = 'text-message';
            const textElement = document.createElement('div');
            textElement.className = 'text';
            textElement.textContent = message;
            messageElement.appendChild(textElement);
        }
    
        // Assign message styling
        if (sender === username) {
            messageElement.classList.add(type === 'file' ? 'file-message' : 'text-message', 'self');
            messageContainer.classList.add('self-container');
            messageElement.dataset.messageId = messageId;
            messageElement.dataset.status = status;
        } else {
            messageElement.classList.add(type === 'file' ? 'file-message' : 'text-message', 'other');
            messageContainer.classList.add('other-container');
        }
    
        messageElement.addEventListener('click', () => {
            timeElement.style.display = timeElement.style.display === 'none' ? 'block' : 'none';
            timeElement.textContent = sender === username
                ? `${timeString} - ${(messageElement.dataset.status === '1' ? 'Đã xem' : 'Chưa xem')}`
                : timeString;
            messageContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    
        messageContainer.appendChild(timeElement);
        messageContainer.appendChild(messageElement);
        chatBox.insertBefore(messageContainer, chatBox.firstChild);
    }    

    // Hàm tải file
    function downloadFile(fileName) {
        const fileUrl = `/uploads/${fileName}`;
    
        // Fetch tệp từ server và tạo blob để đảm bảo tải xuống cho tất cả loại file
        fetch(fileUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Không thể tải file');
                }
                return response.blob();
            })
            .then(blob => {
                const downloadUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(downloadUrl); // Giải phóng URL blob sau khi tải
            })
            .catch(error => {
                console.error('Lỗi khi tải file:', error);
            });
    }

    // Hàm đánh dấu tin nhắn đã xem khi người dùng tập trung vào trường nhập
    async function markMessagesAsSeen() {
        if (!currentChatFriend) return;

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
                socket.emit('messages-seen', { from: username, to: currentChatFriend });
            }
        } catch (error) {
            console.error('Lỗi khi đánh dấu tin nhắn đã xem:', error);
        }
    }

    chatInput.addEventListener('focus', markMessagesAsSeen);

    // Lắng nghe tin nhắn riêng tư từ socket và hiển thị lên giao diện
    socket.on('private-message', (data) => {
        if (data.from === username) return;

        // Nếu chat đang mở với người gửi, hiển thị tin nhắn mà không cần gọi lại openChat
        if (currentChatFriend === data.from && isChatOpened) {
            const dateSent = data.date_sent ? new Date(data.date_sent) : new Date();
            displayMessage(data.from, data.message, dateSent, null, '0', data.type || 'text', data.size || null);
        } else if (!isChatOpened) {
            openChat(data.from);
        }
    });

    // Lắng nghe sự kiện messages-seen và cập nhật trạng thái tin nhắn
    socket.on('messages-seen', (data) => {
        const recipientUsername = data.from;
        if (currentChatFriend !== recipientUsername) return;

        const messageElements = document.querySelectorAll('.message-container.self-container .text-message, .message-container.self-container .file-message');
        messageElements.forEach((messageElement) => {
            messageElement.dataset.status = '1';
        });
    });

})();
