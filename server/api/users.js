const pool = require('../config/db');
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Users } = require('../models')

const isAdmin = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await pool.query('SELECT division FROM users WHERE uuid = $1', [decoded.uuid]);
        const user = result.rows[0];

        if (!user || user.division !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin only'});
        }

        next();
    } catch (error) {
        console.error('Authorization error:', error);
        res.status(401).json({ error: 'Invalid Token' });
    }
};

const getUserHandler = async (req, res) => {
    try {
        const { id, division } = req.query;

        let query = 'SELECT id, name, email, username, division, created_at, updated_at FROM users';
        let values = [];

        if (id) {
            query += ' WHERE id = $1';
            values.push(id);
        } else if (division) {
            query += ' WHERE division = $1';
            values.push(division);
        }

        const result = await pool.query(query, values);

        if (id && result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ users: result.rows });
    } catch (error) {
        console.error('Fetch users error:', error);
        res.status(500).json({ error: 'Server Error' })
    }
};

const getUserProfileHandler = async (req, res) => {
    try {
        const user = await Users.findOne({
            attributes: ['uuid', 'name', 'username', 'email', 'division', 'role'],
            where: { uuid: req.user.uuid}
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', details: error.message})
    }
}

const updateUserHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, username, password, division } = req.body;

        // Validasi input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array() });
        }

        // Cek apakah user ada
        const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Ambil data lama
        const oldUser = userCheck.rows[0];

        // Hash password jika diperbarui
        let hashedPassword = oldUser.password;
        if (password) {
            const passwordRegex = /^(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
            if (!passwordRegex.test(password)) {
                return res.status(400).json({
                    error: 'Password must be at least 8 characters, contain 1 uppercase letter, and 1 special character'
                });
            }
            hashedPassword = await bcrypt.hash(password, 10);
        }

        // Update hanya field yang diberikan
        const updatedUser = {
            name: name || oldUser.name,
            email: email || oldUser.email,
            username: username || oldUser.username,
            password: hashedPassword,
            division: division || oldUser.division
        };

        await pool.query(
            `UPDATE users SET name = $1, email = $2, username = $3, password = $4, division = $5, updated_at = NOW() WHERE id = $6`,
            [updatedUser.name, updatedUser.email, updatedUser.username, updatedUser.password, updatedUser.division, id]
        );

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};


const deleteUserHandler = async (req, res) => {
    try {
        const { id } = req.params;

        const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        await pool.query('DELETE FROM users WHERE id = $1', [id]);

        res.json({ message: 'User deleted successfully' });
    } catch(error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Server Error' });
    }
    
}

module.exports = { 
    getUserHandler,
    updateUserHandler,
    getUserProfileHandler, 
    deleteUserHandler, 
    isAdmin };