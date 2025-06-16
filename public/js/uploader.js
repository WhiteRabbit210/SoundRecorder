class AudioUploader {
    constructor() {
        this.uploadBtn = document.getElementById('uploadBtn');
        this.uploadProgress = document.getElementById('uploadProgress');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        // 設定から読み込み
        const config = window.APP_CONFIG || {};
        this.getSignedUrlEndpoint = config.API_BASE_URL 
            ? config.API_BASE_URL + config.GET_SIGNED_URL_ENDPOINT 
            : config.GET_SIGNED_URL_ENDPOINT || '/api/get-upload-url';
        this.useDirectS3Upload = false;
    }

    async upload(audioBlob, fileName) {
        if (!audioBlob) {
            this.showError('アップロードする音声ファイルがありません');
            return;
        }

        this.showProgress();
        this.uploadBtn.disabled = true;

        try {
            if (this.useDirectS3Upload) {
                // S3直接アップロード（CORS設定が必要）
                await this.uploadToS3Direct(audioBlob, fileName);
            } else {
                // 署名付きURL経由でのアップロード
                await this.uploadWithSignedUrl(audioBlob, fileName);
            }
            
        } catch (error) {
            console.error('Upload error:', error);
            this.onUploadError(error.message);
        } finally {
            this.uploadBtn.disabled = false;
            this.hideProgress();
        }
    }

    async uploadWithSignedUrl(audioBlob, fileName) {
        // Step 1: 署名付きURLを取得
        const urlResponse = await fetch(this.getSignedUrlEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fileName: fileName,
                fileType: audioBlob.type,
                fileSize: audioBlob.size
            })
        });

        if (!urlResponse.ok) {
            throw new Error('署名付きURLの取得に失敗しました');
        }

        const { uploadUrl, fileKey } = await urlResponse.json();

        // Step 2: S3に直接アップロード
        const response = await this.uploadWithProgress(uploadUrl, audioBlob, 'PUT');
        
        if (!response.ok) {
            throw new Error('ファイルのアップロードに失敗しました');
        }

        this.onUploadSuccess({ 
            message: 'アップロードが完了しました',
            fileKey: fileKey 
        });
    }

    async uploadToS3Direct(audioBlob, fileName) {
        // クライアントサイドのみでの実装例（推奨されません）
        // 実際の実装では署名付きURLを使用してください
        this.showError('直接S3アップロードは設定されていません');
    }

    uploadWithProgress(url, data, method = 'POST') {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    this.updateProgress(percentComplete);
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(new Response(xhr.responseText, {
                        status: xhr.status,
                        statusText: xhr.statusText,
                        headers: this.parseHeaders(xhr.getAllResponseHeaders())
                    }));
                } else {
                    reject(new Error(`HTTP Error: ${xhr.status}`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('ネットワークエラーが発生しました'));
            });

            xhr.addEventListener('abort', () => {
                reject(new Error('アップロードがキャンセルされました'));
            });

            xhr.open(method, url);
            if (method === 'PUT') {
                xhr.setRequestHeader('Content-Type', data.type || 'application/octet-stream');
                xhr.send(data);
            } else {
                xhr.send(data);
            }
        });
    }

    parseHeaders(headerString) {
        const headers = new Headers();
        const lines = headerString.trim().split('\n');
        
        lines.forEach(line => {
            const parts = line.split(':');
            const key = parts.shift().trim();
            const value = parts.join(':').trim();
            headers.append(key, value);
        });
        
        return headers;
    }

    showProgress() {
        this.uploadProgress.style.display = 'block';
        this.updateProgress(0);
    }

    hideProgress() {
        setTimeout(() => {
            this.uploadProgress.style.display = 'none';
        }, 1000);
    }

    updateProgress(percent) {
        this.progressFill.style.width = percent + '%';
        this.progressText.textContent = percent + '%';
    }

    onUploadSuccess(result) {
        this.updateProgress(100);
        this.showSuccess('アップロードが完了しました！');
        
        if (window.recorder) {
            window.recorder.updateRecordingsList();
        }
    }

    onUploadError(message) {
        this.showError(message || 'アップロードに失敗しました');
    }

    showSuccess(message) {
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #34C759;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            animation: slideUp 0.3s ease;
        `;
        successMessage.textContent = message;
        
        document.body.appendChild(successMessage);
        
        setTimeout(() => {
            successMessage.remove();
        }, 3000);
    }

    showError(message) {
        if (window.recorder) {
            window.recorder.showError(message);
        }
    }
}