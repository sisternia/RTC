// \webrtc\public\js\video-setup.js

let localStream;
let cameraStream;
let screenStream;
let cameraEnabled = true;
let micEnabled = true;
let recordingStream;
let mediaRecorder;
let audioChunks = [];
const peers = {};

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

// Hàm khởi tạo stream media
async function initMedia() {
    try {
        // Thử truy cập webcam và micro của người dùng
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setupStreams(stream);
    } catch (error) {
        console.error('Lỗi khi truy cập thiết bị media.', error);

        // Xử lý các lỗi cụ thể
        switch (error.name) {
            case 'NotReadableError':
            case 'TrackStartError':
            case 'OverconstrainedError':
            case 'NotAllowedError':
                // Webcam đã được sử dụng hoặc quyền truy cập bị từ chối
                await handleCameraUnavailable();
                break;
            case 'NotFoundError':
            case 'DevicesNotFoundError':
                // Không tìm thấy webcam
                await handleNoCamera();
                break;
            default:
                // Các lỗi khác
                await handleNoMedia();
                break;
        }
    }
}

// Xử lý khi không thể sử dụng camera hoặc đang được sử dụng
async function handleCameraUnavailable() {
    try {
        // Thử truy cập chỉ micro
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Sử dụng stream video giả và âm thanh thực
        const dummyVideoStream = createDummyVideoStream();
        const combinedStream = new MediaStream([...dummyVideoStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
        setupStreams(combinedStream);
    } catch (err) {
        console.error('Lỗi khi truy cập thiết bị âm thanh.', err);
        // Sử dụng video giả và không có âm thanh
        const dummyVideoStream = createDummyVideoStream();
        setupStreams(dummyVideoStream);
    }
}

// Xử lý khi không tìm thấy camera
async function handleNoCamera() {
    try {
        // Thử truy cập chỉ micro
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Sử dụng stream video giả và âm thanh thực
        const dummyVideoStream = createDummyVideoStream();
        const combinedStream = new MediaStream([...dummyVideoStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
        setupStreams(combinedStream);
    } catch (err) {
        console.error('Lỗi khi truy cập thiết bị âm thanh.', err);
        // Sử dụng video giả và không có âm thanh
        const dummyVideoStream = createDummyVideoStream();
        setupStreams(dummyVideoStream);
    }
}

// Xử lý khi không có thiết bị media
async function handleNoMedia() {
    // Sử dụng video giả và không có âm thanh
    const dummyVideoStream = createDummyVideoStream();
    setupStreams(dummyVideoStream);
}

// Hàm thiết lập các stream và gửi sự kiện 'ready'
function setupStreams(stream) {
    cameraStream = stream;
    localStream = stream.clone();
    recordingStream = stream.clone();
    localVideo.srcObject = localStream;
    socket.emit('ready', { username, roomId });
}

// Khởi tạo media
initMedia();

// Sự kiện bật/tắt camera
toggleCameraButton.addEventListener('click', () => {
    cameraEnabled = !cameraEnabled;
    const videoTrack = cameraStream.getVideoTracks()[0];

    if (videoTrack) {
        videoTrack.enabled = cameraEnabled;
    }

    toggleCameraButton.innerHTML = cameraEnabled
        ? '<i class="bi bi-camera-video"></i>'
        : '<i class="bi bi-camera-video-off"></i>';

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

    toggleMicButton.innerHTML = micEnabled
        ? '<i class="bi bi-mic"></i>'
        : '<i class="bi bi-mic-mute"></i>';

    socket.emit('toggle-mic', micEnabled);
});

// Thêm video từ người dùng khác
function addRemoteVideo(userId, username, stream) {
    const videoContainer = document.createElement('div');
    videoContainer.className = 'secondary-video-box video-box';
    videoContainer.id = `video-container-${userId}`;

    const userLabel = document.createElement('div');
    userLabel.className = 'user-label';
    userLabel.textContent = username;

    const remoteVideo = document.createElement('video');
    remoteVideo.id = `video-${userId}`;
    remoteVideo.autoplay = true;

    // Kiểm tra nếu stream có video tracks
    if (stream.getVideoTracks().length > 0) {
        remoteVideo.srcObject = stream;
    } else {
        // Sử dụng stream video giả nếu không có video track
        remoteVideo.srcObject = createDummyVideoStream();
    }

    const pinIcon = document.createElement('i');
    pinIcon.className = 'bi bi-pin pin-icon';

    videoContainer.appendChild(userLabel);
    videoContainer.appendChild(remoteVideo);
    videoContainer.appendChild(pinIcon);
    remoteVideos.appendChild(videoContainer);
}

// Bắt đầu chia sẻ màn hình
document.getElementById('toggleDisplay').addEventListener('click', () => {
    if (!screenStream) {
        navigator.mediaDevices.getDisplayMedia({ video: true }).then(stream => {
            screenStream = stream;
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
                localVideo.srcObject = localStream;
                localVideo.classList.remove('screen-video'); // Gỡ bỏ lớp CSS khi quay lại camera

                Object.values(peers).forEach(peer => {
                    const videoSender = peer._pc.getSenders().find(s => s.track.kind === 'video');
                    videoSender.replaceTrack(cameraStream.getVideoTracks()[0]);
                });
            };

            localVideo.srcObject = localStream;
            localVideo.classList.add('screen-video'); // Thêm lớp CSS cho video màn hình

            // Gửi lại stream mới tới các peer
            Object.values(peers).forEach(peer => {
                const videoSender = peer._pc.getSenders().find(s => s.track.kind === 'video');
                videoSender.replaceTrack(screenTrack);
            });

        }).catch(err => {
            console.error('Lỗi khi chia sẻ màn hình:', err);
        });
    } else {
        // Dừng chia sẻ màn hình và quay lại camera
        screenStream.getTracks().forEach(track => track.stop());
        screenStream = null;
        localStream.removeTrack(localStream.getVideoTracks()[0]);
        localStream.addTrack(cameraStream.getVideoTracks()[0]);
        localVideo.srcObject = localStream;
        localVideo.classList.remove('screen-video'); // Gỡ bỏ lớp CSS khi quay lại camera

        Object.values(peers).forEach(peer => {
            const videoSender = peer._pc.getSenders().find(s => s.track.kind === 'video');
            videoSender.replaceTrack(cameraStream.getVideoTracks()[0]);
        });
    }
});
