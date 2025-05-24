const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');


const TechnicianSkill = sequelize.define('TechnicianSkill', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID, allowNull: false},
    skill_uuid: { type: DataTypes.UUID, allowNull: false},
    technician_uuid: { type: DataTypes.UUID, allowNull: false}
}, {
    timestamps: true,
    tableName: 'technician_skill',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = TechnicianSkill;