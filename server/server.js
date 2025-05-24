require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 3000;
const cors = require('cors');

// Konfigurasi CORS - PENTING: ditempatkan sebelum semua middleware dan route
app.use(cors({
    origin: 'http://localhost:3001', // Sesuaikan dengan port Next.js Anda
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type'],
}));

// Menangani OPTIONS request (preflight)
// app.options('*', (req, res) => {
//     res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
//     res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//     res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
//     res.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type');
//     res.header('Access-Control-Max-Age', '86400');
//     res.sendStatus(200);
// });

// Import konfigurasi & middleware
const setupMiddleware = require('./config/middleware');
setupMiddleware(app);

// Import database (Sequelize)
const sequelize = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const reportRoutes = require('./routes/reportRoutes');
const progressRoutes = require('./routes/progressRoutes');
const buildingRoutes = require('./routes/buildingRoutes');
const skillRoutes = require('./routes/skillRoutes');

// Mendaftarkan routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/report-progress', progressRoutes);
app.use('/api/building', buildingRoutes);
app.use('/api/skill', skillRoutes);

// Health Check API
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Konfigurasi untuk file statis (gambar/video)
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), {
    setHeaders: (res, filePath, stat) => {
        // Konfigurasi header CORS untuk file statis
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3001');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type');
        res.setHeader('Accept-Ranges', 'bytes');
      
        // Mengatur header Content-Disposition untuk video
        if (filePath.match(/\.(mp4|webm|mov|avi|mkv)$/i)) {
            res.setHeader('Content-Disposition', 'inline');
            
            // Mengatur Content-Type yang tepat untuk video
            const ext = path.extname(filePath).toLowerCase();
            if (ext === '.mp4') res.setHeader('Content-Type', 'video/mp4');
            else if (ext === '.webm') res.setHeader('Content-Type', 'video/webm');
            else if (ext === '.mov') res.setHeader('Content-Type', 'video/quicktime');
            else if (ext === '.avi') res.setHeader('Content-Type', 'video/x-msvideo');
            else if (ext === '.mkv') res.setHeader('Content-Type', 'video/x-matroska');
        }
    }
}));

// Endpoint khusus untuk pemutaran video dengan dukungan streaming
app.get('/api/video/:videoPath', (req, res) => {
    const videoPath = path.join(__dirname, 'public/uploads', req.params.videoPath);
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize-1;
        const chunksize = (end-start)+1;
        const file = fs.createReadStream(videoPath, {start, end});
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
            'Access-Control-Allow-Origin': 'http://localhost:3001',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Range',
            'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length, Content-Type',
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
            'Access-Control-Allow-Origin': 'http://localhost:3001',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Range',
            'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length, Content-Type',
        };
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
    }
});

// Global Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Server error' });
});

// Koneksi ke database dan menjalankan server
sequelize.authenticate()
    .then(() => {
        console.log('✅ Database connected successfully');
        return sequelize.sync(); // Sinkronisasi model ke database
    })
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err);
    });