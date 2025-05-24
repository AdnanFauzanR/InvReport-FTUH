const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
    uploadReport,
    addReportHandler,
    getReportsHandler,
    detailReportHandler,
    updateReportHandler,
    deleteReportsHandler,
} = require('../api/report');
const validate = require('../middleware/validate');
const { authorizeRoles } = require('../api/users');

router.post('/add-report', uploadReport.array('files', 5), [
    body('name').notEmpty().withMessage('Name is required'),
    body('phone_number').notEmpty().withMessage('Phone Number is required'),
    body('location').notEmpty().withMessage('Location is required'),
    body('description').isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters')
], validate, addReportHandler);

router.get('/list-report', getReportsHandler);

router.get('/detail-report', detailReportHandler);

router.put('/update-report/:uuid', authorizeRoles('Admin', 'Kepala Workshop'), validate, updateReportHandler);

router.delete('/delete-report', authorizeRoles('Admin', 'Kepala Workshop') ,deleteReportsHandler);

router.delete('/delete-all-report', authorizeRoles('Admin', 'Kepala Workshop') ,deleteReportsHandler);

module.exports = router;