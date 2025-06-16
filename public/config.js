// 環境設定ファイル
// CloudFront配信時はこのファイルを環境に合わせて変更してください

window.APP_CONFIG = {
    // APIエンドポイント（Lambda関数のURL等）
    API_BASE_URL: '',
    
    // S3署名付きURL取得エンドポイント
    GET_SIGNED_URL_ENDPOINT: '/api/get-upload-url',
    
    // アップロード機能を有効にするか
    ENABLE_UPLOAD: false,
    
    // ローカルストレージのみ使用（アップロード無効時）
    LOCAL_ONLY_MODE: true,
    
    // S3直接アップロード設定（ENABLE_S3_DIRECTがtrueの場合に使用）
    ENABLE_S3_DIRECT: false,
    S3_BUCKET_NAME: '',
    S3_REGION: 'ap-northeast-1',
    S3_ACCESS_KEY_ID: '',  // 本番環境では使用しないこと！
    S3_SECRET_ACCESS_KEY: '',  // 本番環境では使用しないこと！
    
    // Cognito設定（推奨：S3アクセスにはCognitoを使用）
    USE_COGNITO: false,
    COGNITO_IDENTITY_POOL_ID: '',
    COGNITO_REGION: 'ap-northeast-1',
    
    // 最大録音時間（秒）
    MAX_RECORDING_DURATION: 300, // 5分
    
    // 最大ファイルサイズ（MB）
    MAX_FILE_SIZE_MB: 50,
    
    // 保存する録音履歴の最大数
    MAX_RECORDINGS_HISTORY: 10
};