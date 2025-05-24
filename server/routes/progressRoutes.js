const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
    uploadProgress,
    addProgressHandler,
    getProgressHandler,
    deleteProgressHandler,
    updateProgressHandler,
} = require('../api/progress');
const { authorizeRoles } = require('../api/users');
const validate = require('../middleware/validate');

router.post('/add-progress', uploadProgress.single('file'),[
    body('status').notEmpty().withMessage('Status is required'),
    body('report_uuid').notEmpty().withMessage('Report UUID is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('description').isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters')
], authorizeRoles('Admin', 'Kepala Workshop', 'Teknisi'), validate, addProgressHandler);

router.get('/list-progress', authorizeRoles('Admin', 'Kepala Workshop', 'Wokrshop', 'Fakultas', 'Departemen'),getProgressHandler);

router.put('/update-progress-status/:uuid', authorizeRoles('Admin', 'Kepala Workshop'), validate, updateProgressHandler);

router.delete('/delete-progress', authorizeRoles('Admin', 'Kepala Workshop'),deleteProgressHandler);

router.delete('/delete-all-progress', authorizeRoles('Admin', 'Kepala Workshop') ,deleteProgressHandler);

module.exports = router;