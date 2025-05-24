const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Report = sequelize.define('Report', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.UUID },
    name: { type: DataTypes.STRING, allowNull: false },
    phone_number: { type: DataTypes.STRING, allowNull: false },
    location: {type: DataTypes.STRING, allowNull: false },
    in_room_uuid: {type: DataTypes.UUID, allowNull: true },
    out_room: { type: DataTypes.TEXT, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: false },
    priority: { type: DataTypes.ENUM('Prioritas Tinggi', 'Prioritas Sedang', 'Prioritas Rendah'), allowNull: true},
    technician_uuid: { type: DataTypes.UUID, allowNull: true },
    progress_uuid: { type: DataTypes.UUID, allowNull: true},
    report_files: { type: DataTypes.STRING, allowNull: false },
    report_url: { type: DataTypes.STRING, allowNull: false},
    ticket: { type: DataTypes.STRING, allowNull: false},
    longitude: { type: DataTypes.FLOAT, allowNull: false},
    latitude: { type: DataTypes.FLOAT, allowNull: false}
}, {
    timestamps: true,
    tableName: 'reports',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Report;