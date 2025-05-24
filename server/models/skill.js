const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Skill = sequelize.define('Skill', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
    uuid: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
},{
    timestamps: false,
    tableName: 'skills',
});

module.exports = Skill;