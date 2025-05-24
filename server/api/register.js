const sequelize = require('../config/db');
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const Users = require('../models/users');
const TechnicianSkill = require('../models/technician_skill');
const Skill = require('../models/skill');

const registerHandler = async (req, res) => {
    let transaction;
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, username, password, division, role, technician_skill } = req.body;

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

        // 🔥 1️⃣ Validasi jika role adalah Teknisi, maka technician_skill wajib diisi
        if (role === 'Teknisi') {
            if (!technician_skill || !Array.isArray(technician_skill) || technician_skill.length === 0) {
                return res.status(400).json({ error: 'Technician must have at least one skill' });
            }
        }

        transaction = await sequelize.transaction();

        // 🔥 2️⃣ Buat User baru
        const newUser = await Users.create({
            uuid: userId,
            name: name,
            email: email,
            username: username,
            division: division,
            role: role,
            password: hashedPassword
        }, { transaction });

        // 🔥 3️⃣ Jika Teknisi, tambahkan Skill melalui pivot table
        if (role === 'Teknisi') {
        for (const skillUuid of technician_skill) {
            // 🔍 Periksa apakah skill_uuid ada di master data Skill
            const skillExists = await Skill.findOne({ where: { uuid: skillUuid }, transaction });
            
            if (!skillExists) {
                // 🔴 Jika skill tidak ditemukan, lempar error dan rollback
                throw new Error(`Skill with UUID ${skillUuid} not found`);
            }

            let technician_skill_uuid = uuidv4();
            await TechnicianSkill.create({
                uuid: technician_skill_uuid,
                technician_uuid: userId,
                skill_uuid: skillUuid
            }, { transaction });
        }
}


        await transaction.commit();

        const userData = {
            name: newUser.name,
            division: newUser.division
        }

        res.status(201).json({
            message: 'User registered successfully',
            user: userData
        });

    } catch (error) {
        if (transaction) await transaction.rollback();

        console.error('Registration error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = registerHandler;