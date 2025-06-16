class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioBlob = null;
        this.stream = null;
        this.startTime = null;
        this.timerInterval = null;
        this.isPaused = false;
        this.pausedTime = 0;
        
        this.recordBtn = document.getElementById('recordBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.recordingTime = document.getElementById('recordingTime');
        this.recordingStatus = document.querySelector('.status-text');
        
        this.initializeRecorder();
    }

    async initializeRecorder() {
        try {
            const constraints = { 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            const mimeTypes = [
                'audio/webm;codecs=opus',
                'audio/mp4',
                'audio/webm',
                'audio/ogg',
                'audio/wav'
            ];
            
            let selectedMimeType = '';
            for (const mimeType of mimeTypes) {
                if (MediaRecorder.isTypeSupported(mimeType)) {
                    selectedMimeType = mimeType;
                    break;
                }
            }
            
            if (!selectedMimeType) {
                throw new Error('お使いのブラウザは音声録音に対応していません');
            }
            
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: selectedMimeType
            });
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.stopTimer();
                this.audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder.mimeType });
                this.audioChunks = [];
                this.displayRecording();
            };
            
            this.recordBtn.disabled = false;
            this.updateStatus('準備完了', 'ready');
            
        } catch (error) {
            console.error('マイクアクセスエラー:', error);
            this.showError('マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。');
        }
    }

    startRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
            this.audioChunks = [];
            this.mediaRecorder.start();
            this.startTime = Date.now() - this.pausedTime;
            this.pausedTime = 0;
            this.isPaused = false;
            
            this.startTimer();
            this.updateStatus('録音中', 'recording');
            
            this.recordBtn.disabled = true;
            this.pauseBtn.disabled = false;
            this.stopBtn.disabled = false;
            this.recordBtn.classList.add('recording');
            
            if (window.visualizer) {
                window.visualizer.start(this.stream);
            }
        }
    }

    pauseRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.pause();
            this.pausedTime = Date.now() - this.startTime;
            this.isPaused = true;
            this.stopTimer();
            this.updateStatus('一時停止中', 'paused');
            
            this.pauseBtn.textContent = '再開';
            this.pauseBtn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
                <span>再開</span>
            `;
        } else if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
            this.mediaRecorder.resume();
            this.startTime = Date.now() - this.pausedTime;
            this.isPaused = false;
            this.startTimer();
            this.updateStatus('録音中', 'recording');
            
            this.pauseBtn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16"/>
                    <rect x="14" y="4" width="4" height="16"/>
                </svg>
                <span>一時停止</span>
            `;
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            this.stopTimer();
            
            this.recordBtn.disabled = false;
            this.pauseBtn.disabled = true;
            this.stopBtn.disabled = true;
            this.recordBtn.classList.remove('recording');
            
            this.pauseBtn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16"/>
                    <rect x="14" y="4" width="4" height="16"/>
                </svg>
                <span>一時停止</span>
            `;
            
            if (window.visualizer) {
                window.visualizer.stop();
            }
            
            this.updateStatus('録音完了', 'stopped');
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            this.recordingTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 100);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateStatus(text, state) {
        this.recordingStatus.textContent = text;
        this.recordingStatus.className = `status-text status-${state}`;
    }

    displayRecording() {
        if (!this.audioBlob) return;
        
        const audioURL = URL.createObjectURL(this.audioBlob);
        const audioPlayer = document.getElementById('audioPlayer');
        audioPlayer.src = audioURL;
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const fileName = `recording_${timestamp}.${this.getFileExtension()}`;
        const fileSize = (this.audioBlob.size / 1024).toFixed(1) + ' KB';
        
        document.getElementById('fileName').textContent = fileName;
        document.getElementById('fileSize').textContent = fileSize;
        document.getElementById('playbackSection').style.display = 'block';
        
        this.setupDownload(fileName);
        
        this.saveToLocalHistory({
            name: fileName,
            size: fileSize,
            date: new Date().toLocaleString('ja-JP'),
            blob: this.audioBlob
        });
    }

    getFileExtension() {
        const mimeType = this.mediaRecorder.mimeType;
        if (mimeType.includes('webm')) return 'webm';
        if (mimeType.includes('mp4')) return 'mp4';
        if (mimeType.includes('ogg')) return 'ogg';
        if (mimeType.includes('wav')) return 'wav';
        return 'webm';
    }

    setupDownload(fileName) {
        const downloadBtn = document.getElementById('downloadBtn');
        downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(this.audioBlob);
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(a.href);
        };
    }

    saveToLocalHistory(recording) {
        let recordings = JSON.parse(localStorage.getItem('recordings') || '[]');
        
        // 音声データをIndexedDBに保存
        this.saveAudioToIndexedDB(recording.name, recording.blob);
        
        recordings.unshift({
            name: recording.name,
            size: recording.size,
            date: recording.date,
            mimeType: this.mediaRecorder.mimeType
        });
        
        const maxRecordings = window.APP_CONFIG?.MAX_RECORDINGS_HISTORY || 10;
        if (recordings.length > maxRecordings) {
            // 古い録音をIndexedDBから削除
            const removed = recordings.slice(maxRecordings);
            removed.forEach(rec => this.deleteAudioFromIndexedDB(rec.name));
            recordings = recordings.slice(0, maxRecordings);
        }
        
        localStorage.setItem('recordings', JSON.stringify(recordings));
        this.updateRecordingsList();
    }
    
    async saveAudioToIndexedDB(name, blob) {
        const db = await this.openIndexedDB();
        const transaction = db.transaction(['recordings'], 'readwrite');
        const store = transaction.objectStore('recordings');
        store.put({ name, blob, timestamp: Date.now() });
    }
    
    async deleteAudioFromIndexedDB(name) {
        const db = await this.openIndexedDB();
        const transaction = db.transaction(['recordings'], 'readwrite');
        const store = transaction.objectStore('recordings');
        store.delete(name);
    }
    
    async getAudioFromIndexedDB(name) {
        const db = await this.openIndexedDB();
        const transaction = db.transaction(['recordings'], 'readonly');
        const store = transaction.objectStore('recordings');
        const request = store.get(name);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result?.blob);
            request.onerror = () => reject(request.error);
        });
    }
    
    openIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('AudioRecorderDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('recordings')) {
                    db.createObjectStore('recordings', { keyPath: 'name' });
                }
            };
        });
    }

    updateRecordingsList() {
        const recordings = JSON.parse(localStorage.getItem('recordings') || '[]');
        const listContainer = document.getElementById('listContainer');
        
        if (recordings.length === 0) {
            listContainer.innerHTML = '<p class="empty-message">録音履歴はありません</p>';
            return;
        }
        
        listContainer.innerHTML = recordings.map((rec, index) => `
            <div class="recording-item">
                <div class="recording-info">
                    <div class="recording-name">${rec.name}</div>
                    <div class="recording-date">${rec.date} - ${rec.size}</div>
                </div>
                <div class="recording-actions">
                    <button class="btn btn-small btn-secondary" onclick="window.recorder.playRecording('${rec.name}')">再生</button>
                    <button class="btn btn-small btn-secondary" onclick="window.recorder.downloadRecording('${rec.name}')">DL</button>
                    <button class="btn btn-small btn-secondary" onclick="window.recorder.deleteRecording('${rec.name}')">削除</button>
                </div>
            </div>
        `).join('');
    }

    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        errorText.textContent = message;
        errorMessage.style.display = 'flex';
        
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }

    async playRecording(name) {
        const blob = await this.getAudioFromIndexedDB(name);
        if (blob) {
            const audioPlayer = document.getElementById('audioPlayer');
            audioPlayer.src = URL.createObjectURL(blob);
            audioPlayer.play();
            document.getElementById('playbackSection').style.display = 'block';
        } else {
            this.showError('録音データが見つかりません');
        }
    }
    
    async downloadRecording(name) {
        const blob = await this.getAudioFromIndexedDB(name);
        if (blob) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = name;
            a.click();
            URL.revokeObjectURL(a.href);
        } else {
            this.showError('録音データが見つかりません');
        }
    }
    
    async deleteRecording(name) {
        if (confirm('この録音を削除しますか？')) {
            // IndexedDBから削除
            await this.deleteAudioFromIndexedDB(name);
            
            // LocalStorageから削除
            let recordings = JSON.parse(localStorage.getItem('recordings') || '[]');
            recordings = recordings.filter(rec => rec.name !== name);
            localStorage.setItem('recordings', JSON.stringify(recordings));
            
            this.updateRecordingsList();
        }
    }

    getAudioBlob() {
        return this.audioBlob;
    }
}

window.hideError = function() {
    document.getElementById('errorMessage').style.display = 'none';
};