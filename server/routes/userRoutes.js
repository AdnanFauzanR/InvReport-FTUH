const express = require('express');
const { body } = require('express-validator');
const { 
    getUsersHandler,
    getUserProfileHandler,
    updateUserHandler, 
    deleteUserHandler, 
    authorizeRoles,
} = require('../api/users');
const validate = require('../middleware/validate');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Route untuk update user (sebagian atau keseluruhan)
router.put('/update-user/:userId', authorizeRoles('Admin'), validate, updateUserHandler);

router.get('/get-user-profile', authenticateToken, getUserProfileHandler);

router.get('/get-user-profile/:id', getUserProfileHandler);

router.get('/list-user', getUsersHandler)

// Route untuk delete user
router.delete('/delete-user/:userId', authorizeRoles('Admin'), deleteUserHandler);

module.exports = router;