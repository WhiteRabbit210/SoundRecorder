class S3Uploader {
    constructor() {
        this.config = window.APP_CONFIG || {};
        this.s3 = null;
        this.initialized = false;
        
        if (this.config.ENABLE_S3_DIRECT) {
            this.initialize();
        }
    }
    
    async initialize() {
        if (this.config.USE_COGNITO) {
            await this.initializeWithCognito();
        } else if (this.config.S3_ACCESS_KEY_ID && this.config.S3_SECRET_ACCESS_KEY) {
            // 注意: 本番環境では使用しないこと！
            console.warn('警告: アクセスキーを直接使用しています。本番環境ではCognitoを使用してください。');
            await this.initializeWithKeys();
        } else {
            console.error('S3アップロードの設定が不完全です');
        }
    }
    
    async initializeWithCognito() {
        try {
            AWS.config.region = this.config.COGNITO_REGION;
            AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                IdentityPoolId: this.config.COGNITO_IDENTITY_POOL_ID
            });
            
            await AWS.config.credentials.getPromise();
            
            this.s3 = new AWS.S3({
                apiVersion: '2006-03-01',
                region: this.config.S3_REGION
            });
            
            this.initialized = true;
            console.log('S3アップロード機能が初期化されました（Cognito）');
        } catch (error) {
            console.error('Cognito初期化エラー:', error);
            throw error;
        }
    }
    
    async initializeWithKeys() {
        AWS.config.update({
            accessKeyId: this.config.S3_ACCESS_KEY_ID,
            secretAccessKey: this.config.S3_SECRET_ACCESS_KEY,
            region: this.config.S3_REGION
        });
        
        this.s3 = new AWS.S3({
            apiVersion: '2006-03-01'
        });
        
        this.initialized = true;
        console.log('S3アップロード機能が初期化されました（アクセスキー）');
    }
    
    async uploadToS3(blob, fileName, onProgress) {
        if (!this.initialized) {
            throw new Error('S3アップローダーが初期化されていません');
        }
        
        const key = `recordings/${new Date().toISOString().split('T')[0]}/${fileName}`;
        
        const params = {
            Bucket: this.config.S3_BUCKET_NAME,
            Key: key,
            Body: blob,
            ContentType: blob.type || 'audio/webm',
            ACL: 'private'  // または 'public-read' （公開する場合）
        };
        
        return new Promise((resolve, reject) => {
            const upload = this.s3.upload(params);
            
            upload.on('httpUploadProgress', (progress) => {
                const percentage = Math.round((progress.loaded / progress.total) * 100);
                if (onProgress) {
                    onProgress(percentage);
                }
            });
            
            upload.send((err, data) => {
                if (err) {
                    console.error('S3アップロードエラー:', err);
                    reject(err);
                } else {
                    console.log('S3アップロード成功:', data);
                    resolve({
                        success: true,
                        location: data.Location,
                        key: data.Key,
                        bucket: data.Bucket
                    });
                }
            });
        });
    }
    
    async generatePresignedUrl(key, expiresIn = 3600) {
        if (!this.initialized) {
            throw new Error('S3アップローダーが初期化されていません');
        }
        
        const params = {
            Bucket: this.config.S3_BUCKET_NAME,
            Key: key,
            Expires: expiresIn
        };
        
        return this.s3.getSignedUrlPromise('getObject', params);
    }
}

// グローバルに公開
window.S3Uploader = S3Uploader;