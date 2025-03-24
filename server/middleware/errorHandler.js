const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
    logger.error(err.message);
    res.status(500).json({
        error: 'Server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
};

module.exports = errorHandler;