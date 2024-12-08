// \webrtc\public\js\chat-user.js

(async function() {
    const username = window.username;
    const socket = window.socket;

    if (!socket) {
        console.error('Socket.io chưa được khởi tạo.');
        return;
    }

    let currentChatFriend = null;
    let isChatOpened = false;

    const chatContainer = document.getElementById('chatContainer');
    const chatFriendName = document.getElementById('chatFriendName');
    const chatBox = document.getElementById('chatBox'); 
    const chatInput = document.getElementById('chatInput');
    const sendMessageButton = document.getElementById('sendMessageButton');
    const closeChat = document.getElementById('closeChat');
    const fileIcon = document.querySelector('.bi-folder-symlink.icon');
    let selectedFile = null;

    fileIcon.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.onchange = (event) => {
            selectedFile = event.target.files[0];
            chatInput.value = selectedFile.name; 
        };
        fileInput.click();
    });

    window.openChat = async function(friendUsername, loadHistory = true) {
        currentChatFriend = friendUsername;
        isChatOpened = true;
        chatFriendName.innerText = `Chat với ${friendUsername}`;
        chatBox.innerHTML = '';
        chatContainer.style.display = 'flex';

        const roomId = [username, friendUsername].sort().join('_');
        socket.emit('join-private-room', { roomId });

        if (loadHistory) {
            try {
                const response = await fetch(`/private-messages?user1=${username}&user2=${friendUsername}`);
                const data = await response.json();
                if (data.success) {
                    data.messages.forEach(message => {
                        const dateSent = new Date(message.date_sent);
                        displayMessage(
                            message.user_sent,
                            message.content,
                            dateSent,
                            message._id,
                            message.status.toString(),
                            message.type || 'text',
                            message.size || null,
                            message.filename || null
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

    async function loadFriendList() {
        try {
            const response = await fetch(`/friends?username=${username}`);
            const data = await response.json();
            if (data.success) {
                const friendList = document.getElementById('friendList'); 
                friendList.innerHTML = '';

                data.friends.forEach(friendUsername => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item d-flex justify-content-between align-items-center';
                    li.innerText = friendUsername;
                    li.style.cursor = 'pointer';

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

    loadFriendList();

    closeChat.addEventListener('click', () => {
        chatContainer.style.display = 'none';
        currentChatFriend = null;
        isChatOpened = false;
    });

    async function sendMessage() {
        if (selectedFile) {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('user_sent', username);
            formData.append('user_receive', currentChatFriend);
            formData.append('type', 'file');
            formData.append('size', (selectedFile.size / 1024).toFixed(2) + ' KB');
            formData.append('date_sent', new Date().toISOString());

            try {
                const response = await fetch('/private-messages', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (!data.success) {
                    console.error('Lỗi khi lưu tin nhắn:', data.message);
                } else {
                    const fileNameDisplay = data.data.content;  // tên gốc
                    const fileNameServer = data.data.filename;  // tên lưu trên server

                    displayMessage(username, fileNameDisplay, new Date(), null, '0', 'file', (selectedFile.size / 1024).toFixed(2) + ' KB', fileNameServer);
                    
                    socket.emit('private-message', {
                        to: currentChatFriend,
                        message: fileNameDisplay,
                        filename: fileNameServer,
                        type: 'file',
                        size: (selectedFile.size / 1024).toFixed(2) + ' KB',
                        date_sent: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error('Lỗi khi lưu tin nhắn:', error);
            }

            selectedFile = null;
            chatInput.value = '';
            return;
        }
        
        const message = chatInput.value.trim();
        if (message === '') return;

        const dateSent = new Date();
        displayMessage(username, message, dateSent, null, '0', 'text');

        socket.emit('private-message', {
            to: currentChatFriend,
            message: message,
            date_sent: dateSent.toISOString()
        });

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

        chatInput.value = '';
        chatInput.style.height = 'auto';
    }

    sendMessageButton.addEventListener('click', sendMessage);

    chatInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

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

    function truncateFileName(fileName, maxLength = 10) {
        if (fileName.length <= maxLength) return fileName;
        const extensionIndex = fileName.lastIndexOf('.');
        if (extensionIndex === -1) {
            return fileName.slice(0, maxLength) + '...';
        }
        const namePart = fileName.slice(0, extensionIndex);
        const extensionPart = fileName.slice(extensionIndex);
        return namePart.length > maxLength
            ? `${namePart.slice(0, maxLength - 5)}...${extensionPart}`
            : fileName;
    }

    function displayMessage(sender, content, dateSent, messageId = null, status = '0', type = 'text', size = null, filename = null) {
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
            fileIcon.textContent = content.split('.').pop().toUpperCase();

            const fileDetails = document.createElement('div');
            const fileNameDiv = document.createElement('div');
            fileNameDiv.className = 'file-name';
            fileNameDiv.textContent = truncateFileName(content, 10);

            const fileSize = document.createElement('div');
            fileSize.className = 'file-size';
            fileSize.textContent = size;

            fileDetails.appendChild(fileNameDiv);
            fileDetails.appendChild(fileSize);
            fileContainer.appendChild(fileIcon);
            fileContainer.appendChild(fileDetails);

            const downloadIcon = document.createElement('i');
            downloadIcon.className = 'bi bi-arrow-down-square';
            downloadIcon.style.cursor = 'pointer';
            downloadIcon.title = 'Tải xuống';
            downloadIcon.addEventListener('click', () => {
                downloadFile(filename);
            });

            messageElement.appendChild(fileContainer);
            messageElement.appendChild(downloadIcon);
        } else {
            messageElement.className = 'text-message';
            const textElement = document.createElement('div');
            textElement.className = 'text';
            textElement.textContent = content;
            messageElement.appendChild(textElement);
        }

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

    function downloadFile(fileName) {
        const encodedFileName = encodeURIComponent(fileName);
        const fileUrl = `/uploads/${encodedFileName}`;

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
                URL.revokeObjectURL(downloadUrl);
            })
            .catch(error => {
                console.error('Lỗi khi tải file:', error);
            });
    }

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

    socket.on('private-message', (data) => {
        if (data.from === username) return;
        if (currentChatFriend === data.from && isChatOpened) {
            const dateSent = data.date_sent ? new Date(data.date_sent) : new Date();
            displayMessage(data.from, data.message, dateSent, null, '0', data.type || 'text', data.size || null, data.filename || null);
        } else if (!isChatOpened) {
            openChat(data.from);
        }
    });

    socket.on('messages-seen', (data) => {
        const recipientUsername = data.from;
        if (currentChatFriend !== recipientUsername) return;

        const messageElements = document.querySelectorAll('.message-container.self-container .text-message, .message-container.self-container .file-message');
        messageElements.forEach((messageElement) => {
            messageElement.dataset.status = '1';
        });
    });

})();
