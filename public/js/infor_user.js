// \webrtc\public\js\infor_user.js
(async function() {
    const username = localStorage.getItem('username');
    if (!username) return;

    const userInfoButton = document.getElementById('userInfoButton');
    const modalUsername = document.getElementById('modalUsername');
    const modalEmail = document.getElementById('modalEmail');
    const changePasswordButton = document.getElementById('changePasswordButton');
    const defaultAvatarIcon = document.getElementById('defaultAvatarIcon');
    const userAvatarImg = document.getElementById('userAvatarImg');
    const changeAvatarInput = document.getElementById('changeAvatarInput');

    let avatarCropModal = null;
    let avatarImageToCrop = null;
    let cropper = null;

    userInfoButton.addEventListener('click', async () => {
        try {
            const response = await fetch(`/user-info?username=${username}`);
            const data = await response.json();
            if (data.success) {
                modalUsername.value = data.user.username;
                modalEmail.value = data.user.email;
                if (data.user.avatar && data.user.avatar.trim() !== '') {
                    userAvatarImg.src = `/img/${encodeURIComponent(data.user.avatar)}`;
                    userAvatarImg.style.display = 'block';
                    defaultAvatarIcon.style.display = 'none';
                } else {
                    userAvatarImg.style.display = 'none';
                    defaultAvatarIcon.style.display = 'block';
                }
                const userInfoModal = new bootstrap.Modal(document.getElementById('userInfoModal'));
                userInfoModal.show();
            } else {
                alert('Không thể lấy thông tin người dùng');
            }
        } catch (error) {
            alert('Lỗi khi lấy thông tin người dùng: ' + error.message);
        }
    });

    changePasswordButton.addEventListener('click', () => {
        const userInfoModal = bootstrap.Modal.getInstance(document.getElementById('userInfoModal'));
        userInfoModal.hide();
        const changePasswordModal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
        changePasswordModal.show();
    });

    changeAvatarInput.addEventListener('change', () => {
        const file = changeAvatarInput.files[0];
        if (!file) return;

        // Hiển thị modal crop
        if (!avatarCropModal) {
            avatarCropModal = new bootstrap.Modal(document.getElementById('avatarCropModal'));
            avatarImageToCrop = document.getElementById('avatarImageToCrop');
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            avatarImageToCrop.src = e.target.result;
            avatarImageToCrop.style.display = 'block';

            // Nếu đã có cropper rồi thì destroy
            if (cropper) {
                cropper.destroy();
            }

            cropper = new Cropper(avatarImageToCrop, {
                aspectRatio: 1,
                viewMode: 1,
                background: false,
                zoomable: true,
                movable: true,
                rotatable: false,
                scalable: false,
                guides: false,
                highlight: false,
                dragMode: 'move',
                ready: function () {
                    // Cắt ảnh hình tròn: dùng CSS mask hoặc sau khi crop ra square thì CSS border-radius 50%
                    // Cropper chỉ crop hình vuông, sau đó ta hiển thị avatar tròn bằng CSS.
                }
            });

            avatarCropModal.show();
        };
        reader.readAsDataURL(file);
    });

    const cropAvatarButton = document.getElementById('cropAvatarButton');
    cropAvatarButton.addEventListener('click', async () => {
        if (!cropper) return;

        const canvas = cropper.getCroppedCanvas({
            width: 300,
            height: 300
        });

        const base64Image = canvas.toDataURL('image/png');

        // Gửi base64Image lên server
        const response = await fetch('/upload-avatar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, image: base64Image })
        });
        const data = await response.json();
        if (data.success) {
            // Cập nhật hiển thị avatar
            userAvatarImg.src = `/img/${encodeURIComponent(data.filename)}`;
            userAvatarImg.style.display = 'block';
            defaultAvatarIcon.style.display = 'none';
            avatarCropModal.hide();
        } else {
            alert('Lỗi khi cập nhật avatar: ' + data.message);
        }
    });

})();
