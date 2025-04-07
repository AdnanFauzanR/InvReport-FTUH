const pool = require('../config/db');
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Users } = require('../models');
const { Op } = require('sequelize');

const isAdmin = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await Users.findOne({ where: { uuid: decoded.uuid } });

        if (!user || user.role !== 'Admin') {
            return res.status(403).json({ error: 'Access denied. Admin only' });
        }

        req.user = user;

        next();
    } catch (error) {
        console.error('Authorization error:', error);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

const getUsersHandler = async (req, res) => {
    try {
        const { division, role } = req.query;

        console.log(role);

        const queryOptions = {
            attributes: [
              'uuid', 'name', 'username', 'email', 'division', 'role'  
            ],
            where: {}
        }

        if (role) {
            queryOptions.where['role'] = role;
            queryOptions.order = [['created_at', 'DESC']];
        }

        if (division) {
            queryOptions.where['division'] = division;
            queryOptions.order = [['created_at', 'DESC']];
        }

        const users = await Users.findAll(queryOptions);

        if (!users || users.length === 0) {
            return res.status(404).json({ error: 'No data found' });
        }

        const formattedUsers = users.map(user => ({
            uuid: user.uuid,
            name: user.name,
            username: user.username,
            email: user.email,
            division: user.division,
            role: user.role
        }));

        res.status(200).json(formattedUsers);
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
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
        const { userId } = req.params;
        const { name, username, email, password, division, role } = req.body;

        const updateData = {};

        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (division) updateData.division = division;
        if (role) updateData.role = role;

        // Cek username baru
        if (username) {
            const existingUser = await Users.findOne({
                where: {
                    username,
                    uuid: { [Op.ne]: userId } // Hindari bentrok dengan username milik user sendiri
                }
            });

            if (existingUser) {
                return res.status(400).json({ error: 'Username already exists' });
            }

            updateData.username = username;
        }

        // Validasi dan hash password
        if (password) {
            const passwordRegex = /^(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
            if (!passwordRegex.test(password)) {
                return res.status(400).json({
                    error: 'Password must be at least 8 characters, contain 1 uppercase letter, and 1 special character'
                });
            }

            const hashedPassword = await bcrypt.hash(password, 6);
            updateData.password = hashedPassword;
        }

        // Pastikan ada yang diupdate
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No data to update' });
        }

        const updated = await Users.update(updateData, {
            where: { uuid: userId }
        });

        if (updated[0] === 0) {
            return res.status(404).json({ error: 'User not found or no changes made' });
        }

        res.status(200).json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};

const deleteUserHandler = async (req, res) => {
    try {
        const { userId } = req.params;

        const deleted = await Users.destroy({ where: { uuid: userId } });

        if (deleted === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};

module.exports = { 
    getUsersHandler,
    updateUserHandler,
    getUserProfileHandler, 
    deleteUserHandler, 
    isAdmin };