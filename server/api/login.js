const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/users');
const sequelize = require('../config/db'); // Koneksi database

const loginHandler = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }

        const { username, password } = req.body;

        const user = await User.findOne({ where: { username }});

        if (!user) {
             return res.status(401).json({ error: 'Invalid Credentials. User not found' });
        } 

        const validPassword = await bcrypt.compare(password, user.password);

        console.log('Input Password: ', password);
        console.log('User Password: ', user.password);

        console.log(validPassword);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid Credentials. Missmatch Password' });
        }

        let dashboardRoute = '/';
        switch (user.role) {
            case 'Workshop':
                dashboardRoute = '/dashboard/workshop';
                break;
            case 'Departemen': 
                dashboardRoute = '/dashboard/departemen';
                break;
            case 'Fakultas':
                dashboardRoute = '/dashboard/fakultas';
                break;
            case 'Admin':
                dashboardRoute = '/dashboard/admin';
                break;
            case 'Sub-Admin':
                dashboardRoute = '/dashboard/sub-admin';
                break;
            case 'Teknisi':
                dashboardRoute = '/dashboard/teknisi';
                break;
            default:
                return res.status(403).json({ error: 'Unauthorized role' });
        }

        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                email: user.email,
                division: user.division
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                name: user.name,
                uuid: user.uuid,
                division: user.division
            },
            dashboard: dashboardRoute
        })
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message});
    }
};


module.exports = loginHandler;