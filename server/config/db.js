const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'postgres', // Dialect PostgreSQL
    port: process.env.DB_PORT,
    logging: false, // Hapus log query jika tidak perlu
    dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    }
});

// Cek koneksi ke database
sequelize.authenticate()
    .then(() => console.log('✅ Database connected successfully'))
    .catch(err => console.error('❌ Database connection failed:', err));

module.exports = sequelize;