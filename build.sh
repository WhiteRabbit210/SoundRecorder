#!/bin/bash

# CloudFront配信用のビルドスクリプト

echo "CloudFront配信用のビルドを開始します..."

# ビルドディレクトリの作成
BUILD_DIR="dist"
rm -rf $BUILD_DIR
mkdir -p $BUILD_DIR

# 必要なファイルをコピー
echo "ファイルをコピー中..."
cp -r public/* $BUILD_DIR/

# Service Workerの登録を追加（オプション）
if [ "$1" == "--with-sw" ]; then
    echo "Service Workerを有効化..."
    cat >> $BUILD_DIR/index.html << 'EOF'
<script>
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(err => console.log('SW registration failed'));
    });
}
</script>
EOF
fi

# 設定ファイルの確認
echo ""
echo "重要: CloudFrontにデプロイする前に以下を確認してください:"
echo "1. dist/config.js を編集して環境に合わせた設定を行う"
echo "2. API_BASE_URL に Lambda関数のURLを設定"
echo "3. LOCAL_ONLY_MODE を false に設定（アップロード機能を使用する場合）"
echo ""

# ファイルサイズの確認
echo "ビルド結果:"
du -sh $BUILD_DIR/*

echo ""
echo "ビルド完了！"
echo "配信ファイル: $BUILD_DIR/"
echo ""
echo "S3へのアップロード例:"
echo "aws s3 sync $BUILD_DIR/ s3://your-bucket-name/ --delete"
echo ""
echo "CloudFront の設定:"
echo "- Default Root Object: index.html"
echo "- Error Pages: 404 -> /index.html (SPAの場合)"