// \webrtc\public\js\chat-user.js

(async function() {
    // Access username and socket from the global window object
    const username = window.username;
    const socket = window.socket;

    // Ensure socket is initialized
    if (!socket) {
        console.error('Socket.io chưa được khởi tạo.');
        return;
    }

    // Variables to store current chat friend and chat window state
    let currentChatFriend = null;
    let isChatOpened = false;

    // Get elements from the interface
    const chatContainer = document.getElementById('chatContainer');
    const chatFriendName = document.getElementById('chatFriendName');
    const chatBox = document.getElementById('chatBox'); 
    const chatInput = document.getElementById('chatInput');
    const sendMessageButton = document.getElementById('sendMessageButton');
    const closeChat = document.getElementById('closeChat');
    const fileIcon = document.querySelector('.bi-folder-symlink.icon');
    let selectedFile = null;

    // Event when the user selects a file to send
    fileIcon.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.onchange = (event) => {
            selectedFile = event.target.files[0];
            chatInput.value = selectedFile.name; // Display file name in chatInput
        };
        fileInput.click();
    });

    // Function to open a chat with a friend and load message history
    window.openChat = async function(friendUsername, loadHistory = true) {
        currentChatFriend = friendUsername;
        isChatOpened = true;
        chatFriendName.innerText = `Chat với ${friendUsername}`;
        chatBox.innerHTML = ''; // Clear current chat content
        chatContainer.style.display = 'flex'; // Show chat interface

        // Create room ID and join private chat room
        const roomId = [username, friendUsername].sort().join('_');
        socket.emit('join-private-room', { roomId });

        // If needed, load message history from the server
        if (loadHistory) {
            try {
                const response = await fetch(`/private-messages?user1=${username}&user2=${friendUsername}`);
                const data = await response.json();
                if (data.success) {
                    // Display each message from history
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

    // Get and display friend list
    async function loadFriendList() {
        try {
            const response = await fetch(`/friends?username=${username}`);
            const data = await response.json();
            if (data.success) {
                const friendList = document.getElementById('friendList'); 
                friendList.innerHTML = ''; // Clear current list

                // Add each friend to the list
                data.friends.forEach(friendUsername => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item d-flex justify-content-between align-items-center';
                    li.innerText = friendUsername;
                    li.style.cursor = 'pointer';

                    // Click on friend's name to open chat
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

    // Load friend list when script runs
    loadFriendList();

    // Close chat when user clicks the close button
    closeChat.addEventListener('click', () => {
        chatContainer.style.display = 'none';
        currentChatFriend = null;
        isChatOpened = false;
    });

    // Function to send a message
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
                    const fileName = data.data.content; // Get unique file name from server response
                    displayMessage(username, fileName, new Date(), null, '0', 'file', selectedFile.size);
                    
                    // Emit private message with the file name to the recipient
                    socket.emit('private-message', {
                        to: currentChatFriend,
                        message: fileName,
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
        
        // Handle text messages
        const message = chatInput.value.trim();
        if (message === '') return;

        const dateSent = new Date();

        // Display text message immediately for the sender
        displayMessage(username, message, dateSent, null, '0', 'text');

        // Send text message via socket
        socket.emit('private-message', {
            to: currentChatFriend,
            message: message,
            date_sent: dateSent.toISOString()
        });

        // Save message to the database
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

        // Clear input field
        chatInput.value = '';
        chatInput.style.height = 'auto';
    }

    // Event listener to send message on button click
    sendMessageButton.addEventListener('click', sendMessage);

    // Event listener to send message on Enter key press, Shift + Enter for new line
    chatInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    // Automatically adjust textarea height up to 4 lines
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

    // Function to truncate file name if too long
    function truncateFileName(fileName, maxLength = 10) {
        // Remove unique suffix if present
        const baseName = fileName.replace(/-\d+-\d+/, '');
        const extensionIndex = baseName.lastIndexOf('.');
        if (extensionIndex === -1 || baseName.length <= maxLength) return baseName;

        const namePart = baseName.slice(0, extensionIndex);
        const extensionPart = baseName.slice(extensionIndex);
        return namePart.length > maxLength
            ? `${namePart.slice(0, maxLength - 5)}...${extensionPart}`
            : baseName;
    }

    // Function to display a message on the interface
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
            fileName.textContent = truncateFileName(message, 10);
    
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

    // Function to download a file
    function downloadFile(fileName) {
        const encodedFileName = encodeURIComponent(fileName);
        const fileUrl = `/uploads/${encodedFileName}`;
    
        // Fetch file from server and create blob to ensure download for all file types
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
                URL.revokeObjectURL(downloadUrl); // Release blob URL after download
            })
            .catch(error => {
                console.error('Lỗi khi tải file:', error);
            });
    }

    // Function to mark messages as seen when user focuses on input field
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

    // Listen for private messages from socket and display on interface
    socket.on('private-message', (data) => {
        if (data.from === username) return;

        // If chat is open with the sender, display message without calling openChat again
        if (currentChatFriend === data.from && isChatOpened) {
            const dateSent = data.date_sent ? new Date(data.date_sent) : new Date();
            displayMessage(data.from, data.message, dateSent, null, '0', data.type || 'text', data.size || null);
        } else if (!isChatOpened) {
            openChat(data.from);
        }
    });

    // Listen for messages-seen event and update message status
    socket.on('messages-seen', (data) => {
        const recipientUsername = data.from;
        if (currentChatFriend !== recipientUsername) return;

        const messageElements = document.querySelectorAll('.message-container.self-container .text-message, .message-container.self-container .file-message');
        messageElements.forEach((messageElement) => {
            messageElement.dataset.status = '1';
        });
    });

})();
