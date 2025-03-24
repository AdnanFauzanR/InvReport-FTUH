const cors = require('cors');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 100, // Maks 100 request per 15 menit
    message: 'Too many requests from this IP, please try again later'
});

module.exports = (app) => {
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(morgan('combined'));
    app.use(helmet());
    app.use('/api/', limiter);
};