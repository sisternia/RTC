// \webrtc\public\js\video-setup.js

const { ipcRenderer } = require('electron');

let localStream;
let cameraStream;
let screenStream;
let cameraEnabled = true;
let micEnabled = true;
let recordingStream;
let mediaRecorder;
let audioChunks = [];
let pinnedVideoId = null; // Lưu trữ ID của video đang được ghim
let currentUserId = null; // ID của chính bản thân user
const peers = {};

// Khai báo biến toàn cục cho video chính và nhãn người dùng
let mainVideoElement = document.querySelector('.main-video-box video');
let mainUserLabel = document.querySelector('.main-video-box .user-label');

// Hàm tạo stream video giả (màn hình đen)
function createDummyVideoStream() {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const context = canvas.getContext('2d');

    // Vẽ một hình chữ nhật đen
    context.fillStyle = 'black';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const stream = canvas.captureStream(15); // 15 fps
    return stream;
}

// Hàm khởi tạo kết nối và xác định ID của bản thân
function initSocketConnection(username, roomId) {
    socket.emit('ready', { username, roomId });

    // Lắng nghe sự kiện từ server khi bản thân đã sẵn sàng
    socket.on('user-ready', (data) => {
        if (data.username === username) {
            currentUserId = data.userId; // Lưu ID của bản thân
        }
    });
}

// Hàm khởi tạo stream media
async function initMedia() {
    try {
        // Truy cập webcam và micro của người dùng
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setupStreams(stream);
    } catch (error) {
        console.error('Lỗi khi truy cập thiết bị media:', error);

        switch (error.name) {
            case 'NotReadableError':
                alert('Webcam hoặc micro đang được ứng dụng khác sử dụng. Vui lòng kiểm tra và đóng ứng dụng đó.');
                break;
            case 'NotAllowedError':
                alert('Bạn đã từ chối quyền truy cập vào webcam hoặc micro. Vui lòng cấp quyền.');
                break;
            case 'NotFoundError':
                alert('Không tìm thấy thiết bị media. Vui lòng kiểm tra thiết bị của bạn.');
                break;
            default:
                alert('Lỗi không xác định. Vui lòng thử lại.');
        }

        // Nếu xảy ra lỗi, dùng video giả thay thế
        const dummyVideoStream = createDummyVideoStream();
        setupStreams(dummyVideoStream);
    }
}

// Hàm xử lý khi video của chính bản thân được hiển thị
function setupStreams(stream) {
    cameraStream = stream;
    localStream = stream.clone();
    recordingStream = stream.clone();
    
    // Gắn stream của chính bản thân vào video chính
    mainVideoElement.srcObject = localStream;

    // Gán nhãn là "You" cho video của chính bản thân
    mainUserLabel.textContent = 'You';

    // Phát sự kiện 'ready' tới server
    socket.emit('ready', { username, roomId });
}

// Hàm hoán đổi video giữa người dùng và người khác
function swapVideos(userId) {
    const remoteVideoBox = document.getElementById(`video-card-${userId}`);
    const remoteVideoElement = remoteVideoBox.querySelector('video');
    const remoteUserLabel = remoteVideoBox.querySelector('.user-label');

    // Kiểm tra nếu video remote là của người dùng khác và có video stream
    if (remoteVideoElement.srcObject) {
        // Hoán đổi stream video giữa hai video
        const tempStream = mainVideoElement.srcObject;
        mainVideoElement.srcObject = remoteVideoElement.srcObject;
        remoteVideoElement.srcObject = tempStream;

        // Hoán đổi label giữa hai video
        const tempLabel = mainUserLabel.textContent;
        mainUserLabel.textContent = remoteUserLabel.textContent;
        remoteUserLabel.textContent = tempLabel;

        // Cập nhật lại trạng thái ID của video đang được ghim
        pinnedVideoId = userId;
    }
}

// Thêm sự kiện click vào icon pin
document.addEventListener('click', (event) => {
    if (event.target.classList.contains('pin-icon')) {
        const videoContainer = event.target.closest('.card-body');
        const userId = videoContainer.closest('.card').id.split('-')[2]; // Lấy userId từ ID của video card
        swapVideos(userId);
    }
});

// Hàm đổi video về video của chính bản thân nếu video đang ghim ngắt kết nối
function restoreLocalVideo() {
    // Đổi video trở lại video của chính bản thân
    mainVideoElement.srcObject = localStream;
    mainUserLabel.textContent = 'You';

    pinnedVideoId = null; // Reset trạng thái ghim
}

// Bắt sự kiện khi không có video ghim
function checkPinnedVideo() {
    if (!pinnedVideoId) {
        mainVideoElement.srcObject = localStream;
        mainUserLabel.textContent = 'You';
    }
}

// Bắt đầu chia sẻ màn hình
document.getElementById('toggleDisplay').addEventListener('click', async () => {
    const toggleDisplayButton = document.getElementById('toggleDisplay');

    if (!screenStream) {
        try {
            // Lấy danh sách các nguồn từ main process
            const inputSources = await ipcRenderer.invoke('get-sources');

            // Hiển thị hộp thoại lựa chọn nguồn
            const source = inputSources[0]; // Ví dụ: luôn chọn nguồn đầu tiên (bạn có thể hiển thị danh sách và chọn)

            // Sử dụng nguồn đã chọn để lấy stream
            screenStream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: source.id,
                        minWidth: 1280,
                        maxWidth: 1280,
                        minHeight: 720,
                        maxHeight: 720
                    }
                }
            });

            const screenTrack = screenStream.getVideoTracks()[0];

            // Thay thế video track của camera bằng track của màn hình
            const sender = localStream.getVideoTracks()[0];
            localStream.removeTrack(sender);
            localStream.addTrack(screenTrack);

            screenTrack.onended = () => {
                // Khi dừng chia sẻ màn hình, quay lại camera
                localStream.removeTrack(screenTrack);
                localStream.addTrack(cameraStream.getVideoTracks()[0]);
                screenStream = null;

                // Chỉ cập nhật video chính nếu không có video nào đang được ghim
                if (!pinnedVideoId) {
                    mainVideoElement.srcObject = localStream;
                    mainVideoElement.classList.remove('screen-video');
                }

                // Đặt lại nút về màu ban đầu khi dừng chia sẻ màn hình
                toggleDisplayButton.classList.remove('btn-danger');
                toggleDisplayButton.classList.add('btn-outline-primary');

                Object.values(peers).forEach(peer => {
                    const videoSender = peer._pc.getSenders().find(s => s.track.kind === 'video');
                    videoSender.replaceTrack(cameraStream.getVideoTracks()[0]);
                });
            };

            // Chỉ cập nhật video chính nếu không có video nào đang được ghim
            if (!pinnedVideoId) {
                mainVideoElement.srcObject = localStream;
                mainVideoElement.classList.add('screen-video');
            }

            // Chuyển nút thành màu đỏ khi bắt đầu chia sẻ màn hình
            toggleDisplayButton.classList.remove('btn-outline-primary');
            toggleDisplayButton.classList.add('btn-danger');

            // Gửi lại stream mới tới các peer
            Object.values(peers).forEach(peer => {
                const videoSender = peer._pc.getSenders().find(s => s.track.kind === 'video');
                videoSender.replaceTrack(screenTrack);
            });

        } catch (error) {
            console.error('Lỗi khi chia sẻ màn hình:', error);
        }
    } else {
        // Dừng chia sẻ màn hình và quay lại camera
        screenStream.getTracks().forEach(track => track.stop());
        screenStream = null;
        localStream.removeTrack(localStream.getVideoTracks()[0]);
        localStream.addTrack(cameraStream.getVideoTracks()[0]);

        // Chỉ cập nhật video chính nếu không có video nào đang được ghim
        if (!pinnedVideoId) {
            mainVideoElement.srcObject = localStream;
            mainVideoElement.classList.remove('screen-video');
        }

        // Đặt lại nút về màu ban đầu khi dừng chia sẻ màn hình
        toggleDisplayButton.classList.remove('btn-danger');
        toggleDisplayButton.classList.add('btn-outline-primary');

        Object.values(peers).forEach(peer => {
            const videoSender = peer._pc.getSenders().find(s => s.track.kind === 'video');
            videoSender.replaceTrack(cameraStream.getVideoTracks()[0]);
        });
    }
});

// Khởi tạo media
initMedia();

// Sự kiện bật/tắt camera
toggleCameraButton.addEventListener('click', () => {
    cameraEnabled = !cameraEnabled;
    const videoTrack = cameraStream.getVideoTracks()[0];

    if (videoTrack) {
        videoTrack.enabled = cameraEnabled;
    }

    // Cập nhật biểu tượng và màu của nút camera
    toggleCameraButton.innerHTML = cameraEnabled
        ? '<i class="bi bi-camera-video"></i>'
        : '<i class="bi bi-camera-video-off"></i>';

    // Chuyển nút thành màu đỏ nếu camera bị tắt
    if (cameraEnabled) {
        toggleCameraButton.classList.remove('btn-danger');
        toggleCameraButton.classList.add('btn-outline-primary');
    } else {
        toggleCameraButton.classList.remove('btn-outline-primary');
        toggleCameraButton.classList.add('btn-danger');
    }

    // Cập nhật video track nếu không chia sẻ màn hình
    if (!screenStream) {
        const localVideoTrack = localStream.getVideoTracks()[0];
        if (localVideoTrack) {
            localVideoTrack.enabled = cameraEnabled;
        }
        Object.values(peers).forEach(peer => {
            const videoSender = peer._pc.getSenders().find(s => s.track.kind === 'video');
            if (videoSender && videoTrack) {
                videoSender.replaceTrack(videoTrack);
            }
        });
    }

    socket.emit('toggle-camera', cameraEnabled);
});

// Sự kiện bật/tắt microphone
toggleMicButton.addEventListener('click', () => {
    micEnabled = !micEnabled;
    const audioTrack = localStream.getAudioTracks()[0];

    if (audioTrack) {
        audioTrack.enabled = micEnabled;
    }

    // Cập nhật biểu tượng và màu của nút mic
    toggleMicButton.innerHTML = micEnabled
        ? '<i class="bi bi-mic"></i>'
        : '<i class="bi bi-mic-mute"></i>';

    // Chuyển nút thành màu đỏ nếu mic bị tắt
    if (micEnabled) {
        toggleMicButton.classList.remove('btn-danger');
        toggleMicButton.classList.add('btn-outline-primary');
    } else {
        toggleMicButton.classList.remove('btn-outline-primary');
        toggleMicButton.classList.add('btn-danger');
    }

    socket.emit('toggle-mic', micEnabled);
});

// Hàm thêm video từ người dùng khác
function addRemoteVideo(userId, username, stream) {
    // Tạo thẻ card
    const card = document.createElement('div');
    card.className = 'card video-card';  // Thêm class 'card'
    card.id = `video-card-${userId}`;  // Thêm ID cho video card

    // Tạo thẻ card-body chứa các phần tử bên trong
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';

    // Thẻ tiêu đề cho card (Hiển thị tên người dùng)
    const userLabel = document.createElement('div');
    userLabel.className = 'user-label';

    // Kiểm tra xem đây có phải là video của chính bản thân không
    if (userId === currentUserId) {
        userLabel.textContent = 'You';
    } else {
        userLabel.textContent = username;
    }

    // Tạo phần video cho người dùng từ xa
    const remoteVideo = document.createElement('video');
    remoteVideo.id = `video-${userId}`;
    remoteVideo.autoplay = true;

    // Kiểm tra nếu có video track
    if (stream.getVideoTracks().length > 0) {
        remoteVideo.srcObject = stream;
    } else {
        remoteVideo.srcObject = createDummyVideoStream();
    }

    // Tạo biểu tượng pin cho video
    const pinIcon = document.createElement('i');
    pinIcon.className = 'bi bi-pin pin-icon';

    // Thêm các phần tử vào thẻ card-body
    cardBody.appendChild(userLabel);
    cardBody.appendChild(remoteVideo);
    cardBody.appendChild(pinIcon);

    // Thêm thẻ card-body vào thẻ card
    card.appendChild(cardBody);

    // Thêm thẻ card vào khu vực hiển thị video từ xa
    document.getElementById('remoteVideos').appendChild(card);
}