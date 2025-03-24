const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Report = require('./report').default || require('./report');

const Building = sequelize.define('Building', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
    uuid: { type: DataTypes.UUID },
    building_name: { type: DataTypes.STRING, allowNull: false }
},{
    timestamps: true,
    tableName: 'building',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Building;

