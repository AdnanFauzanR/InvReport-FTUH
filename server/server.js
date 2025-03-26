require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 3000;

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
const buildingRoutes = require('./routes/buildingRoutes')

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/report-progress', progressRoutes);
app.use('/api/building', buildingRoutes);

// Health Check API
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
});

//Url Upload Image/Video
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

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