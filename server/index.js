const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        try {
            await fs.access(uploadDir);
        } catch {
            await fs.mkdir(uploadDir, { recursive: true });
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
            const data = await fs.readFile(recordingsFile, 'utf8');
            recordings = JSON.parse(data);
        } catch (error) {
            recordings = [];
        }

        recordings.unshift(fileInfo);
        await fs.writeFile(recordingsFile, JSON.stringify(recordings, null, 2));

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
            const data = await fs.readFile(recordingsFile, 'utf8');
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
            const data = await fs.readFile(recordingsFile, 'utf8');
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
            await fs.unlink(recording.path);
        } catch (error) {
            console.error('File deletion error:', error);
        }

        recordings.splice(recordingIndex, 1);
        await fs.writeFile(recordingsFile, JSON.stringify(recordings, null, 2));

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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`サーバーが起動しました:`);
    console.log(`  ローカル: http://localhost:${PORT}`);
    console.log(`  ネットワーク: http://192.168.10.134:${PORT}`);
    console.log(`\niPhoneからは http://192.168.10.134:${PORT} にアクセスしてください`);
});