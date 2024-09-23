// \webrtc\public\js\audio-recording.js
let lastAudioSender = ''; // Biến lưu trữ tên người gửi tin nhắn âm thanh trước
let lastAudioTime = '';   // Biến lưu trữ thời gian của tin nhắn âm thanh trước

startRecordingButton.addEventListener('click', () => {
    const isRecording = startRecordingButton.getAttribute('data-recording') === 'true';
    
    if (!isRecording) {
        // Bắt đầu ghi âm - đổi nút thành màu đỏ
        startRecordingButton.innerHTML = '<i class="bi bi-record2"></i>';
        startRecordingButton.setAttribute('data-recording', 'true');
        startRecordingButton.classList.remove('btn-outline-primary'); // Xóa lớp màu nguyên bản
        startRecordingButton.classList.add('btn-danger'); // Thêm lớp màu đỏ
        startAudioRecording();
    } else {
        // Dừng ghi âm - trả nút về màu bình thường
        startRecordingButton.innerHTML = '<i class="bi bi-record"></i>';
        startRecordingButton.setAttribute('data-recording', 'false');
        startRecordingButton.classList.remove('btn-danger'); // Xóa lớp màu đỏ
        startRecordingButton.classList.add('btn-outline-primary'); // Thêm lớp màu nguyên bản
        stopAudioRecording();
    }
});

function startAudioRecording() {
    const audioTrack = recordingStream.getAudioTracks()[0];
    mediaRecorder = new MediaRecorder(new MediaStream([audioTrack]));

    mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        audioChunks = [];

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
            const base64String = reader.result.split(',')[1];
            socket.emit('audio-message', base64String);
        };
    };

    mediaRecorder.start();
}

function stopAudioRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
}

// Khi nhận tin nhắn âm thanh
socket.on('audio-message', (data) => {
    // Lấy thời gian hiện tại
    const currentTime = new Date();
    const hours = currentTime.getHours().toString().padStart(2, '0');
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');
    const timestamp = `[${hours}:${minutes}]`;

    // Kiểm tra nếu tin nhắn là từ chính người dùng (Client này)
    const sender = data.from === socket.username ? 'You' : data.from;

    // Kiểm tra xem có phải cùng người gửi và cùng thời gian hay không
    if (sender !== lastAudioSender || timestamp !== lastAudioTime) {
        // Tạo thẻ div mới nếu khác người gửi hoặc khác thời gian
        const audioContainer = document.createElement('div');
        audioContainer.style.marginBottom = '10px';

        const senderInfo = document.createElement('strong');
        senderInfo.textContent = `${timestamp} ${sender}:`;
        senderInfo.style.display = 'block';

        audioContainer.appendChild(senderInfo);
        messages.appendChild(audioContainer); // Thêm tin nhắn vào khối chứa tin nhắn
    }

    // Tạo khối chứa tin nhắn âm thanh và thêm vào div hiện tại
    const audioElement = document.createElement('audio');
    audioElement.src = `data:audio/webm;base64,${data.audio}`; // Dữ liệu âm thanh được truyền dưới dạng base64
    audioElement.controls = true;

    // Luôn luôn thêm tin nhắn âm thanh vào thẻ hiện tại (dù có thay đổi hay không)
    messages.lastElementChild.appendChild(audioElement);

    // Cập nhật người gửi và thời gian cuối cùng cho âm thanh
    lastAudioSender = sender;
    lastAudioTime = timestamp;

    messages.scrollTop = messages.scrollHeight;  // Tự động cuộn xuống dưới cùng
});