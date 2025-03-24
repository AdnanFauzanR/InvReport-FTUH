const express = require('express');
const { body } = require('express-validator');
const { getUserHandler, updateUserHandler, deleteUserHandler, isAdmin } = require('../api/users');
const validate = require('../middleware/validate');

const router = express.Router();

router.get('/users', getUserHandler);

// Route untuk update user (sebagian atau keseluruhan)
router.put('/users/:id', [
    isAdmin,
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Invalid email'),
    body('username').optional().notEmpty().withMessage('Username cannot be empty'),
    body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('division').optional().notEmpty().withMessage('Division cannot be empty')
], validate, updateUserHandler);

// Route untuk delete user
router.delete('/users/:id', isAdmin, deleteUserHandler);

module.exports = router;