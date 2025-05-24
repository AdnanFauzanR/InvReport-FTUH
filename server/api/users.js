const pool = require('../config/db');
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Users } = require('../models');
const { Op } = require('sequelize');
const Skill = require('../models/skill');
const TechnicianSkill = require('../models/technician_skill');

const authorizeRoles = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            const token = req.header('Authorization')?.replace('Bearer ', '');

            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await Users.findOne({ where: { uuid: decoded.uuid } });

            if (!user || !allowedRoles.includes(user.role)) {
                return res.status(403).json({ error: 'Access denied. Insufficient permissions' });
            }

            req.user = user;
            next();
        } catch (error) {
            console.error('Authorization error:', error);
            res.status(401).json({ error: 'Invalid or expired token' });
        }
    };
};


const getUsersHandler = async (req, res) => {
    try {
        const { division, role } = req.query;

        const queryOptions = {
            attributes: ['uuid', 'name', 'username', 'email', 'division', 'role'],
            where: {},
            include: []
        };

        if (role) {
            queryOptions.where['role'] = role;
            queryOptions.order = [['created_at', 'DESC']];
        }

        if (division) {
            queryOptions.where['division'] = division;
            queryOptions.order = [['created_at', 'DESC']];
        }

        // 🔥 Tambahkan include jika role adalah Teknisi
        if (role === 'Teknisi') {
            
            queryOptions.include.push({
                model: Skill,
                as: 'Skills', // sesuaikan dengan alias di relasi Users.hasMany(Skill)
                through: { attributes: [] }, // hilangkan atribut pivot table
                attributes: ['uuid', 'name']
            });
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
            role: user.role,
            skills: user.Skills ? user.Skills.map(skill => ({ uuid: skill.uuid, name: skill.name })) : []
        }));

        res.status(200).json(formattedUsers);
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};


const getUserProfileHandler = async (req, res) => {
    try {
        const uuid = req.user?.uuid || req.params.id;

        if (!uuid) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const user = await Users.findOne({
            attributes: ['uuid', 'name', 'username', 'email', 'division', 'role'],
            where: { uuid },
            include: [{
                model: Skill,
                as: 'Skills', // alias relasi
                through: { attributes: [] },
                attributes: ['uuid', 'name']
            }]
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const formattedUser = {
            uuid: user.uuid,
            name: user.name,
            username: user.username,
            email: user.email,
            division: user.division,
            role: user.role,
            skills: user.Skills ? user.Skills.map(skill => ({ uuid: skill.uuid, name: skill.name })) : []
        };

        res.status(200).json(formattedUser);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};

const updateUserHandler = async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, username, email, password, division, role, skills } = req.body; // 🔥 tambahkan skills

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
                    uuid: { [Op.ne]: userId }
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
        if (Object.keys(updateData).length === 0 && !skills) {
            return res.status(400).json({ error: 'No data to update' });
        }

        const user = await Users.findOne({ where: { uuid: userId } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 🔥 Jika user adalah Teknisi dan ada skills yang dikirim
        if ((role === 'Teknisi' || user.role === 'Teknisi') && skills) {
            await user.setSkills(skills); // Ganti semua skill user ini dengan yang baru
        }

        // 🔥 Update data user
        const updated = await Users.update(updateData, { where: { uuid: userId } });

        res.status(200).json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};

const deleteUserHandler = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await Users.findOne({ where: { uuid: userId } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 🔥 Jika user adalah Teknisi, hapus relasi skills
        if (user.role === 'Teknisi') {
            const Skill = require('../models/skill');
            await user.setSkills([]); // Hapus semua relasi skill
        }

        // 🔥 Hapus user
        await Users.destroy({ where: { uuid: userId } });

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
    authorizeRoles 
};