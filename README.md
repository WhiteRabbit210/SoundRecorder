# SoundRecorder - iOS Safari対応 音声録音Webアプリ

iOS Safariに対応した音声録音Webアプリケーション。完全にクライアントサイドで動作し、録音データのローカル保存とAWS S3へのアップロードが可能です。

## 特徴

- 📱 **iOS Safari 14.3+対応**
- 🎙️ **MediaRecorder APIによる高品質録音**
- 💾 **IndexedDBによるローカル保存**
- ☁️ **AWS S3への直接アップロード**（オプション）
- 🎵 **リアルタイム音声ビジュアライザー**
- 🔒 **完全クライアントサイド動作**
- 📦 **サーバーレス対応**

## デモ

[デモサイト](https://your-demo-url.com) *(CloudFront配信時に更新)*

## 動作環境

- iOS Safari 14.3以降
- Chrome/Edge/Firefox（最新版）
- HTTPS接続必須（マイクアクセスのため）

## インストール

### 開発環境

```bash
# リポジトリをクローン
git clone https://github.com/WhiteRabbit210/SoundRecorder.git
cd SoundRecorder

# 依存関係をインストール
npm install

# 開発サーバーを起動（HTTP）
npm start

# HTTPSサーバーを起動（推奨）
npm run cert        # 証明書生成（初回のみ）
npm run start:https # HTTPSサーバー起動
```

### 本番環境（静的配信）

```bash
# ビルド
./build.sh

# distフォルダをS3/CloudFrontにアップロード
aws s3 sync dist/ s3://your-bucket-name/ --delete
```

## 設定

`public/config.js`または`dist/config.js`を編集：

```javascript
window.APP_CONFIG = {
    // ローカルのみで使用（デフォルト）
    LOCAL_ONLY_MODE: true,
    
    // S3アップロードを有効化
    ENABLE_S3_DIRECT: false,
    S3_BUCKET_NAME: 'your-bucket-name',
    S3_REGION: 'ap-northeast-1',
    
    // Cognito認証（推奨）
    USE_COGNITO: true,
    COGNITO_IDENTITY_POOL_ID: 'your-identity-pool-id',
};
```

## S3セットアップ

### 1. S3バケットのCORS設定

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["PUT", "POST", "GET"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```

### 2. Cognito Identity Pool作成（推奨）

1. AWSコンソールでCognito Identity Poolを作成
2. 未認証アクセスを有効化
3. IAMロールにS3アップロード権限を付与

## 使い方

1. **録音開始**: 赤い録音ボタンをタップ
2. **一時停止/再開**: 録音中に一時停止可能
3. **停止**: 停止ボタンで録音終了
4. **再生**: 録音した音声をその場で確認
5. **ダウンロード**: ローカルに保存
6. **S3アップロード**: クラウドに保存（設定時）

## プロジェクト構造

```
├── public/              # 開発用ソースファイル
│   ├── index.html      # メインHTML
│   ├── config.js       # 設定ファイル
│   ├── css/            # スタイルシート
│   └── js/             # JavaScriptファイル
├── dist/               # 配信用ビルド
├── server/             # 開発サーバー（オプション）
├── certs/              # SSL証明書
└── standalone.html     # スタンドアロン版
```

## 技術仕様

- **録音**: MediaRecorder API（webm/mp4/ogg）
- **保存**: IndexedDB + LocalStorage
- **可視化**: Web Audio API + Canvas
- **アップロード**: AWS SDK for JavaScript
- **認証**: AWS Cognito Identity

## ライセンス

MIT License

## 作者

WhiteRabbit210

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを作成して変更内容を議論してください。

## サポート

問題が発生した場合は、[Issues](https://github.com/WhiteRabbit210/SoundRecorder/issues)で報告してください。