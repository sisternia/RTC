// \webrtc\public\js\infor_user.js

(function() {
    // Lấy username từ localStorage
    const username = localStorage.getItem('username');

    // Các phần tử trong modal Thông tin User
    const userInfoButton = document.getElementById('userInfoButton');
    const modalUsername = document.getElementById('modalUsername');
    const modalEmail = document.getElementById('modalEmail');
    const changePasswordButton = document.getElementById('changePasswordButton');

    // Sự kiện hiển thị thông tin người dùng
    userInfoButton.addEventListener('click', async () => {
        try {
            const response = await fetch(`/user-info?username=${username}`);
            const data = await response.json();
            if (data.success) {
                modalUsername.value = data.user.username;
                modalEmail.value = data.user.email;
                const userInfoModal = new bootstrap.Modal(document.getElementById('userInfoModal'));
                userInfoModal.show(); // Hiển thị modal với thông tin người dùng
            } else {
                alert('Không thể lấy thông tin người dùng');
            }
        } catch (error) {
            alert('Lỗi khi lấy thông tin người dùng: ' + error.message);
        }
    });

    // Khi bấm vào nút Đổi mật khẩu
    changePasswordButton.addEventListener('click', () => {
        const userInfoModal = bootstrap.Modal.getInstance(document.getElementById('userInfoModal'));
        userInfoModal.hide(); // Ẩn modal Thông tin User
        const changePasswordModal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
        changePasswordModal.show(); // Hiển thị modal Đổi mật khẩu
    });

})();
