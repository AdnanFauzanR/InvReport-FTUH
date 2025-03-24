const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
    uploadProgress,
    addProgressHandler,
    getProgressHandler,
    deleteProgressHandler,
} = require('../api/progress');
const validate = require('../middleware/validate');
const { deleteReportsHandler } = require('../api/report');

router.post('/add-progress', uploadProgress.single('file'),[
    body('status').notEmpty().withMessage('Status is required'),
    body('report_uuid').notEmpty().withMessage('Report UUID is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('description').isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters')
], validate, addProgressHandler);

router.get('/list-progress', getProgressHandler);

router.delete('/delete-progress', deleteProgressHandler);

router.delete('/delete-all-progress', deleteReportsHandler);

module.exports = router;