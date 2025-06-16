const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const PORT = 8443;

// 静的ファイルの配信
app.use(express.static('dist'));

// SPAのためのフォールバック
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 証明書の確認
const certPath = path.join(__dirname, 'certs', 'cert.pem');
const keyPath = path.join(__dirname, 'certs', 'key.pem');

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.error('証明書が見つかりません。先に generate-cert.js を実行してください。');
    process.exit(1);
}

const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
};

https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    let ipAddress = 'localhost';
    
    // ネットワークインターフェースからIPアドレスを取得
    Object.keys(networkInterfaces).forEach(interfaceName => {
        networkInterfaces[interfaceName].forEach(interface => {
            if (interface.family === 'IPv4' && !interface.internal) {
                ipAddress = interface.address;
            }
        });
    });
    
    console.log(`静的ファイル配信用HTTPSサーバーが起動しました:`);
    console.log(`  ローカル: https://localhost:${PORT}`);
    console.log(`  ネットワーク: https://${ipAddress}:${PORT}`);
    console.log(`\n配信ディレクトリ: ./dist/`);
    console.log(`\niPhoneからアクセスする場合:`);
    console.log(`1. https://${ipAddress}:${PORT} にアクセス`);
    console.log(`2. 証明書の警告を承認`);
});