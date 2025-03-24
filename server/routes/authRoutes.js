const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const loginHandler = require('../api/login'); // handler login
const registerHandler = require('../api/register'); // handler register
const validate = require('../middleware/validate');

// Route for register
router.post('/register', [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('username').notEmpty().withMessage('Username id required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('division').notEmpty().withMessage('Division is required')
], validate, registerHandler);

// Route for login
router.post('/login', [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
], validate, loginHandler);

module.exports = router;