// \webrtc\public\js\audio-recording.js

startRecordingButton.addEventListener('click', () => {
    const isRecording = startRecordingButton.getAttribute('data-recording') === 'true';
    if (!isRecording) {
        startRecordingButton.innerHTML = '<i class="bi bi-record2"></i>';
        startRecordingButton.setAttribute('data-recording', 'true');
        startAudioRecording();
    } else {
        startRecordingButton.innerHTML = '<i class="bi bi-record"></i>';
        startRecordingButton.setAttribute('data-recording', 'false');
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
