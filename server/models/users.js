const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Users = sequelize.define('Users', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID },
    name: { type: DataTypes.STRING, allowNull: false },
    username: { type: DataTypes.STRING, allowNull: false, unique: true},
    email: { type: DataTypes.STRING, allowNull: false},
    division: { type: DataTypes.ENUM(
      'Fakultas', 
      'Gedung Arsitektur', 
      'Gedung Mesin', 
      'Gedung Sipil', 
      'Gedung Elektro', 
      'Gedung Geologi', 
      'Gedung Perkapalan',
      'Workshop'
    ), allowNull: false },
    role: { type: DataTypes.ENUM(
      'Admin', 
      'Sub-Admin', 
      'Workshop', 
      'Fakultas', 
      'Departemen', 
      'Teknisi', 
      'Kepala Workshop'
    ), allowNull: false},
    password: { type: DataTypes.STRING, allowNull: false},
}, {
    timestamps: true,
    tableName: 'users',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
})

module.exports = Users;