let recorder = null;
let visualizer = null;
let uploader = null;
let s3Uploader = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('お使いのブラウザは音声録音に対応していません。iOS Safari 14.3以降をご使用ください。');
        return;
    }

    if (!window.MediaRecorder) {
        alert('MediaRecorder APIがサポートされていません。iOS Safari 14.3以降をご使用ください。');
        return;
    }

    recorder = new AudioRecorder();
    visualizer = new AudioVisualizer('visualizer');
    uploader = new AudioUploader();
    
    // S3アップローダーの初期化
    if (window.APP_CONFIG && window.APP_CONFIG.ENABLE_S3_DIRECT) {
        s3Uploader = new S3Uploader();
        document.getElementById('s3UploadBtn').style.display = 'inline-flex';
    }
    
    window.recorder = recorder;
    window.visualizer = visualizer;
    window.uploader = uploader;
    window.s3Uploader = s3Uploader;

    document.getElementById('recordBtn').addEventListener('click', () => {
        recorder.startRecording();
    });

    document.getElementById('pauseBtn').addEventListener('click', () => {
        recorder.pauseRecording();
    });

    document.getElementById('stopBtn').addEventListener('click', () => {
        recorder.stopRecording();
    });

    // アップロード機能の有効/無効を設定に基づいて制御
    const uploadBtn = document.getElementById('uploadBtn');
    if (window.APP_CONFIG && window.APP_CONFIG.LOCAL_ONLY_MODE) {
        uploadBtn.style.display = 'none';
    } else {
        uploadBtn.addEventListener('click', async () => {
            const audioBlob = recorder.getAudioBlob();
            const fileName = document.getElementById('fileName').textContent;
            
            if (audioBlob && fileName) {
                await uploader.upload(audioBlob, fileName);
            }
        });
    }

    // S3アップロードボタンのイベントリスナー
    if (s3Uploader) {
        document.getElementById('s3UploadBtn').addEventListener('click', async () => {
            const audioBlob = recorder.getAudioBlob();
            const fileName = document.getElementById('fileName').textContent;
            
            if (audioBlob && fileName) {
                const progressBar = document.getElementById('uploadProgress');
                const progressFill = document.getElementById('progressFill');
                const progressText = document.getElementById('progressText');
                
                try {
                    progressBar.style.display = 'block';
                    document.getElementById('s3UploadBtn').disabled = true;
                    
                    const result = await s3Uploader.uploadToS3(audioBlob, fileName, (percentage) => {
                        progressFill.style.width = percentage + '%';
                        progressText.textContent = percentage + '%';
                    });
                    
                    alert('S3へのアップロードが完了しました！');
                    console.log('アップロード結果:', result);
                    
                } catch (error) {
                    alert('S3アップロードエラー: ' + error.message);
                    console.error('S3アップロードエラー:', error);
                } finally {
                    document.getElementById('s3UploadBtn').disabled = false;
                    setTimeout(() => {
                        progressBar.style.display = 'none';
                    }, 1000);
                }
            }
        });
    }

    recorder.updateRecordingsList();

    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        console.warn('HTTPSでない環境では、マイクアクセスが制限される可能性があります。');
    }
});