// \webrtc\public\js\change_pass.js

(function() {
    // Các phần tử trong modal Đổi mật khẩu
    const confirmChangePasswordButton = document.getElementById('confirmChangePasswordButton');

    // Khi bấm nút Xác nhận đổi mật khẩu
    confirmChangePasswordButton.addEventListener('click', async () => {
        const oldPassword = document.getElementById('oldPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;

        // Kiểm tra mật khẩu mới và xác nhận mật khẩu
        if (newPassword !== confirmNewPassword) {
            alert('Mật khẩu mới và xác nhận mật khẩu không khớp.');
            return;
        }

        try {
            const username = localStorage.getItem('username'); // Lấy username từ localStorage
            const response = await fetch('/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, oldPassword, newPassword })
            });

            const result = await response.json();
            if (result.success) {
                alert('Đổi mật khẩu thành công');
                const changePasswordModal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
                changePasswordModal.hide(); // Ẩn modal Đổi mật khẩu
            } else {
                alert(result.message || 'Đổi mật khẩu thất bại');
            }
        } catch (error) {
            alert('Lỗi khi đổi mật khẩu: ' + error.message);
        }
    });

    // Hàm xử lý bật/tắt hiển thị mật khẩu
    function togglePasswordVisibility(inputId, iconId) {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);
        if (input.type === 'password') {
            input.type = 'text'; // Hiển thị mật khẩu
            icon.classList.remove('bi-eye-slash');
            icon.classList.add('bi-eye');
        } else {
            input.type = 'password'; // Ẩn mật khẩu
            icon.classList.remove('bi-eye');
            icon.classList.add('bi-eye-slash');
        }
    }

    // Gán sự kiện cho các nút bật/tắt hiển thị mật khẩu
    const toggleOldPassword = document.getElementById('toggleOldPassword');
    const toggleNewPassword = document.getElementById('toggleNewPassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

    if (toggleOldPassword && toggleNewPassword && toggleConfirmPassword) {
        toggleOldPassword.addEventListener('click', () => {
            togglePasswordVisibility('oldPassword', 'toggleOldPassword');
        });

        toggleNewPassword.addEventListener('click', () => {
            togglePasswordVisibility('newPassword', 'toggleNewPassword');
        });

        toggleConfirmPassword.addEventListener('click', () => {
            togglePasswordVisibility('confirmNewPassword', 'toggleConfirmPassword');
        });
    }
})();
