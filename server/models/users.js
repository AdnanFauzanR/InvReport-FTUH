const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Users = sequelize.define('Users', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID },
    name: { type: DataTypes.STRING, allowNull: false },
    username: { type: DataTypes.STRING, allowNull: false, unique: true},
    email: { type: DataTypes.STRING, allowNull: false},
    division: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false},
    password: { type: DataTypes.STRING, allowNull: false},
}, {
    timestamps: true,
    tableName: 'users',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
})

module.exports = Users;