const express = require('express');
const { body } = require('express-validator');
const { 
    getUsersHandler,
    getUserProfileHandler,
    updateUserHandler, 
    deleteUserHandler, 
    isAdmin,
} = require('../api/users');
const validate = require('../middleware/validate');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Route untuk update user (sebagian atau keseluruhan)
router.put('/users/:id', [
    isAdmin,
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Invalid email'),
    body('username').optional().notEmpty().withMessage('Username cannot be empty'),
    body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('division').optional().notEmpty().withMessage('Division cannot be empty')
], validate, updateUserHandler);

router.get('/get-user-profile', authenticateToken, getUserProfileHandler);

router.get('/list-user', getUsersHandler)

// Route untuk delete user
router.delete('/users/:id', isAdmin, deleteUserHandler);

module.exports = router;