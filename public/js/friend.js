// \webrtc\public\js\friend.js

(function() {
    const friendButton = document.getElementById('friendButton');

    // Các biến cho tính năng tìm kiếm
    const searchUserButton = document.getElementById('searchUserButton');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const closeSearchModalButton = document.getElementById('closeSearchModalButton');

    // Lấy username từ localStorage
    const username = localStorage.getItem('username');
    if (!username) {
        window.location.href = 'login.html'; // Chuyển về trang đăng nhập nếu chưa có username
    }

    // Xử lý sự kiện "Tìm kiếm"
    searchUserButton.addEventListener('click', () => {
        searchInput.value = ''; // Reset input
        searchResults.innerHTML = ''; // Xóa kết quả cũ
        const searchUserModal = new bootstrap.Modal(document.getElementById('searchUserModal'));
        searchUserModal.show(); // Hiển thị modal tìm kiếm
    });

    // Xử lý khi nhập vào ô tìm kiếm
    searchInput.addEventListener('input', async () => {
        const searchQuery = searchInput.value.trim();
        if (searchQuery) {
            try {
                // Gọi API để lấy danh sách người dùng gợi ý
                const response = await fetch(`/autocomplete-users?query=${encodeURIComponent(searchQuery)}`);
                const data = await response.json();
                if (data.success) {
                    displaySearchResults(data.users);
                } else {
                    searchResults.innerHTML = '<p>Không tìm thấy người dùng nào.</p>';
                }
            } catch (error) {
                console.error('Lỗi khi tìm kiếm: ', error.message);
                searchResults.innerHTML = `<p>Lỗi khi tìm kiếm: ${error.message}</p>`;
            }
        } else {
            searchResults.innerHTML = '';
        }
    });

    // Hàm hiển thị kết quả tìm kiếm và gợi ý
    function displaySearchResults(users) {
        searchResults.innerHTML = ''; // Xóa kết quả cũ
        if (users.length > 0) {
            users.forEach(user => {
                const userDiv = document.createElement('div');
                userDiv.classList.add('search-result', 'd-flex', 'justify-content-between', 'align-items-center');

                const usernameSpan = document.createElement('span');
                usernameSpan.textContent = user.username;

                const addFriendButton = document.createElement('button');
                addFriendButton.classList.add('btn', 'btn-primary', 'btn-sm');
                addFriendButton.textContent = 'Kết bạn';

                // Kiểm tra xem có phải là chính mình không
                if (user.username === username) {
                    addFriendButton.disabled = true;
                }

                // Kiểm tra trạng thái kết bạn
                checkFriendStatus(user.username, addFriendButton);

                addFriendButton.addEventListener('click', () => {
                    if (addFriendButton.textContent === 'Kết bạn') {
                        sendFriendRequest(user.username, addFriendButton);
                    } else if (addFriendButton.textContent === 'Hủy') {
                        cancelFriendRequest(user.username, addFriendButton);
                    }
                });

                userDiv.appendChild(usernameSpan);
                userDiv.appendChild(addFriendButton);

                searchResults.appendChild(userDiv);
            });
        } else {
            searchResults.innerHTML = '<p>Không tìm thấy người dùng nào.</p>';
        }
    }

    // Đóng modal tìm kiếm khi nhấn nút "Đóng"
    closeSearchModalButton.addEventListener('click', () => {
        searchResults.innerHTML = ''; // Xóa kết quả khi đóng modal
    });

    // Xử lý sự kiện "Bạn bè"
    friendButton.addEventListener('click', () => {
        const friendModal = new bootstrap.Modal(document.getElementById('friendModal'));
        friendModal.show();
        getFriends();
        getFriendRequests();
        getSentRequests();
    });

    // Kiểm tra trạng thái kết bạn
    async function checkFriendStatus(otherUsername, button) {
        try {
            const response = await fetch(`/check-friend-status?username=${username}&otherUsername=${otherUsername}`);
            const data = await response.json();
            if (data.success) {
                switch (data.status) {
                    case 'friends':
                        button.textContent = 'Bạn bè';
                        button.disabled = true;
                        break;
                    case 'requested':
                        button.textContent = 'Hủy';
                        break;
                    case 'pending':
                        button.textContent = 'Đã gửi lời mời';
                        button.disabled = true;
                        break;
                    default:
                        button.textContent = 'Kết bạn';
                }
            }
        } catch (error) {
            console.error('Lỗi khi kiểm tra trạng thái kết bạn:', error);
        }
    }

    // Gửi lời mời kết bạn
    async function sendFriendRequest(recipientUsername, button) {
        try {
            const response = await fetch('/add-friend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ requesterUsername: username, recipientUsername })
            });
            const data = await response.json();
            if (data.success) {
                button.textContent = 'Hủy';
                // Cập nhật lại danh sách lời mời đã gửi
                getSentRequests();
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Lỗi khi gửi lời mời kết bạn:', error);
        }
    }

    // Hủy lời mời kết bạn
    async function cancelFriendRequest(recipientUsername, button) {
        try {
            const response = await fetch('/cancel-friend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ requesterUsername: username, recipientUsername })
            });
            const data = await response.json();
            if (data.success) {
                button.textContent = 'Kết bạn';
                // Cập nhật lại danh sách lời mời đã gửi
                getSentRequests();
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Lỗi khi hủy lời mời kết bạn:', error);
        }
    }

    // Lấy danh sách bạn bè
    async function getFriends() {
        try {
            const response = await fetch(`/friends?username=${username}`);
            const data = await response.json();
            const friendsList = document.getElementById('friendsList');
            friendsList.innerHTML = '';
            if (data.success && data.friends.length > 0) {
                data.friends.forEach(friendUsername => {
                    const li = document.createElement('li');
                    li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
                    li.textContent = friendUsername;

                    const removeFriendButton = document.createElement('button');
                    removeFriendButton.classList.add('btn', 'btn-danger', 'btn-sm');
                    removeFriendButton.textContent = 'Hủy kết bạn';

                    removeFriendButton.addEventListener('click', () => {
                        removeFriend(friendUsername);
                    });

                    li.appendChild(removeFriendButton);
                    friendsList.appendChild(li);
                });
            } else {
                friendsList.innerHTML = '<p>Không có bạn bè nào.</p>';
            }
        } catch (error) {
            console.error('Lỗi khi lấy danh sách bạn bè:', error);
        }
    }

    // Lấy danh sách lời mời kết bạn
    async function getFriendRequests() {
        try {
            const response = await fetch(`/friend-requests?username=${username}`);
            const data = await response.json();
            const friendRequestsList = document.getElementById('friendRequestsList');
            friendRequestsList.innerHTML = '';
            if (data.success && data.friendRequests.length > 0) {
                data.friendRequests.forEach(requesterUsername => {
                    const li = document.createElement('li');
                    li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
                    li.textContent = requesterUsername;

                    const acceptButton = document.createElement('button');
                    acceptButton.classList.add('btn', 'btn-success', 'btn-sm', 'me-2');
                    acceptButton.textContent = 'Chấp nhận';

                    const declineButton = document.createElement('button');
                    declineButton.classList.add('btn', 'btn-danger', 'btn-sm');
                    declineButton.textContent = 'Từ chối';

                    acceptButton.addEventListener('click', () => {
                        acceptFriendRequest(requesterUsername);
                    });

                    declineButton.addEventListener('click', () => {
                        declineFriendRequest(requesterUsername);
                    });

                    const buttonGroup = document.createElement('div');
                    buttonGroup.appendChild(acceptButton);
                    buttonGroup.appendChild(declineButton);

                    li.appendChild(buttonGroup);
                    friendRequestsList.appendChild(li);
                });
            } else {
                friendRequestsList.innerHTML = '<p>Không có lời mời kết bạn nào.</p>';
            }
        } catch (error) {
            console.error('Lỗi khi lấy lời mời kết bạn:', error);
        }
    }

    // Lấy danh sách lời mời đã gửi
    async function getSentRequests() {
        try {
            const response = await fetch(`/sent-requests?username=${username}`);
            const data = await response.json();
            const sentRequestsList = document.getElementById('sentRequestsList');
            sentRequestsList.innerHTML = '';
            if (data.success && data.sentRequests.length > 0) {
                data.sentRequests.forEach(recipientUsername => {
                    const li = document.createElement('li');
                    li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
                    li.textContent = recipientUsername;

                    const cancelButton = document.createElement('button');
                    cancelButton.classList.add('btn', 'btn-danger', 'btn-sm');
                    cancelButton.textContent = 'Hủy yêu cầu';

                    cancelButton.addEventListener('click', () => {
                        cancelFriendRequest(recipientUsername);
                    });

                    li.appendChild(cancelButton);
                    sentRequestsList.appendChild(li);
                });
            } else {
                sentRequestsList.innerHTML = '<p>Không có lời mời nào.</p>';
            }
        } catch (error) {
            console.error('Lỗi khi lấy lời mời đã gửi:', error);
        }
    }

    // Chấp nhận lời mời kết bạn
    async function acceptFriendRequest(requesterUsername) {
        try {
            const response = await fetch('/accept-friend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ requesterUsername, recipientUsername: username })
            });
            const data = await response.json();
            if (data.success) {
                getFriendRequests();
                getFriends();
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Lỗi khi chấp nhận lời mời kết bạn:', error);
        }
    }

    // Từ chối lời mời kết bạn
    async function declineFriendRequest(requesterUsername) {
        try {
            const response = await fetch('/cancel-friend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ requesterUsername, recipientUsername: username })
            });
            const data = await response.json();
            if (data.success) {
                getFriendRequests();
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Lỗi khi từ chối lời mời kết bạn:', error);
        }
    }

    // Hủy kết bạn
    async function removeFriend(friendUsername) {
        try {
            const response = await fetch('/cancel-friend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ requesterUsername: username, recipientUsername: friendUsername })
            });
            const data = await response.json();
            if (data.success) {
                getFriends();
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Lỗi khi hủy kết bạn:', error);
        }
    }
})();
