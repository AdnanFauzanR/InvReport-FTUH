const sequelize = require('../config/db');
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const Users = require('../models/users');

const registerHandler = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, username, password, division, role } = req.body;

        const existingUser = await Users.findOne({ where: { username }});
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters, contain 1 uppercase letter, and 1 special character'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 6);

        const userId = uuidv4();

        const newUser = await Users.create({
            uuid: userId,
            name: name,
            email: email,
            username: username,
            division: division,
            role: role,
            password: hashedPassword
        });

        const userData = {
            name: newUser.name,
            division: newUser.division
        }

        res.status(201).json({
            message: 'User registered successfully',
            user: userData
        })
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message })
    }
};

module.exports = registerHandler;