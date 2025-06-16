const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const os = require('os');
require('dotenv').config();

const app = express();
const PORT = process.env.HTTPS_PORT || 8443; // 別のポートを使用

// より寛容なCORS設定
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static('public'));

// ネットワークインターフェースの情報を取得
function getNetworkAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    
    for (const name of Object.keys(interfaces)) {
        for (const interface of interfaces[name]) {
            if (interface.family === 'IPv4' && !interface.internal) {
                addresses.push({
                    name: name,
                    address: interface.address
                });
            }
        }
    }
    return addresses;
}

// ルートパスでの確認用エンドポイント
app.get('/', (req, res) => {
    res.send(`
        <h1>メディアレコーダーサーバー</h1>
        <p>サーバーは正常に動作しています。</p>
        <p>アクセス元: ${req.ip}</p>
        <p>現在時刻: ${new Date().toLocaleString('ja-JP')}</p>
    `);
});

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        clientIp: req.ip,
        serverAddresses: getNetworkAddresses()
    });
});

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        try {
            await fs.promises.access(uploadDir);
        } catch {
            await fs.promises.mkdir(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${timestamp}_${originalName}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('サポートされていないファイル形式です'), false);
        }
    }
});

app.post('/api/upload', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'ファイルがアップロードされていません' });
        }

        const fileInfo = {
            id: Date.now().toString(),
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            uploadDate: new Date().toISOString(),
            path: req.file.path
        };

        const recordingsFile = path.join(__dirname, 'uploads', 'recordings.json');
        let recordings = [];
        
        try {
            const data = await fs.promises.readFile(recordingsFile, 'utf8');
            recordings = JSON.parse(data);
        } catch (error) {
            recordings = [];
        }

        recordings.unshift(fileInfo);
        await fs.promises.writeFile(recordingsFile, JSON.stringify(recordings, null, 2));

        res.json({
            success: true,
            message: 'ファイルが正常にアップロードされました',
            file: {
                id: fileInfo.id,
                filename: fileInfo.filename,
                size: fileInfo.size,
                uploadDate: fileInfo.uploadDate
            }
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            error: 'アップロード中にエラーが発生しました',
            message: error.message 
        });
    }
});

app.get('/api/recordings', async (req, res) => {
    try {
        const recordingsFile = path.join(__dirname, 'uploads', 'recordings.json');
        let recordings = [];
        
        try {
            const data = await fs.promises.readFile(recordingsFile, 'utf8');
            recordings = JSON.parse(data);
        } catch (error) {
            recordings = [];
        }

        const safeRecordings = recordings.map(rec => ({
            id: rec.id,
            filename: rec.originalName,
            size: rec.size,
            uploadDate: rec.uploadDate
        }));

        res.json({
            success: true,
            recordings: safeRecordings
        });

    } catch (error) {
        console.error('Get recordings error:', error);
        res.status(500).json({ 
            error: '録音一覧の取得中にエラーが発生しました' 
        });
    }
});

app.delete('/api/recordings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const recordingsFile = path.join(__dirname, 'uploads', 'recordings.json');
        
        let recordings = [];
        try {
            const data = await fs.promises.readFile(recordingsFile, 'utf8');
            recordings = JSON.parse(data);
        } catch (error) {
            return res.status(404).json({ error: '録音が見つかりません' });
        }

        const recordingIndex = recordings.findIndex(rec => rec.id === id);
        if (recordingIndex === -1) {
            return res.status(404).json({ error: '録音が見つかりません' });
        }

        const recording = recordings[recordingIndex];
        
        try {
            await fs.promises.unlink(recording.path);
        } catch (error) {
            console.error('File deletion error:', error);
        }

        recordings.splice(recordingIndex, 1);
        await fs.promises.writeFile(recordingsFile, JSON.stringify(recordings, null, 2));

        res.json({
            success: true,
            message: '録音が削除されました'
        });

    } catch (error) {
        console.error('Delete recording error:', error);
        res.status(500).json({ 
            error: '録音の削除中にエラーが発生しました' 
        });
    }
});

app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'ファイルサイズが大きすぎます（最大50MB）' });
        }
    }
    res.status(500).json({ error: error.message });
});

const certPath = path.join(__dirname, '..', 'certs', 'cert.pem');
const keyPath = path.join(__dirname, '..', 'certs', 'key.pem');

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.error('証明書が見つかりません。先にgenerate-cert.jsを実行してください:');
    console.error('  node generate-cert.js');
    process.exit(1);
}

const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
};

// サーバー起動
const server = https.createServer(httpsOptions, app);

server.listen(PORT, '0.0.0.0', () => {
    console.log('\n=== HTTPSサーバーが起動しました ===');
    console.log(`ポート: ${PORT}`);
    console.log('\n利用可能なアドレス:');
    
    const addresses = getNetworkAddresses();
    addresses.forEach(addr => {
        console.log(`  ${addr.name}: https://${addr.address}:${PORT}`);
    });
    
    console.log(`  ローカル: https://localhost:${PORT}`);
    
    console.log('\n=== iPhoneからアクセスする手順 ===');
    console.log('1. iPhoneとMacが同じWi-Fiネットワークに接続されていることを確認');
    console.log('2. iPhoneのSafariで上記のアドレスのいずれかにアクセス');
    console.log('3. 証明書の警告が表示されたら:');
    console.log('   - 「詳細を表示」をタップ');
    console.log('   - 「このWebサイトにアクセス」をタップ');
    console.log('   - パスワードを入力して続行');
    console.log('\n=== トラブルシューティング ===');
    console.log('接続できない場合は以下を確認:');
    console.log('- Macのファイアウォール設定');
    console.log('- 両デバイスが同じネットワークにいること');
    console.log('- ルーターのアイソレーション設定');
    console.log('===============================\n');
});

// エラーハンドリング
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`ポート ${PORT} は既に使用中です。`);
        console.error('別のポートを指定するか、既存のプロセスを終了してください。');
    } else {
        console.error('サーバーエラー:', error);
    }
    process.exit(1);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
    console.log('\nサーバーを終了しています...');
    server.close(() => {
        console.log('サーバーが終了しました。');
        process.exit(0);
    });
});