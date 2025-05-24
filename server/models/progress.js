const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Progress = sequelize.define('Progress', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
    uuid: { type: DataTypes.UUID },
    report_uuid: { type: DataTypes.UUID, allowNull: false},
    status: { type: DataTypes.ENUM(
      'Laporan Masuk',
      'Ditunda',
      'Ditunda - Menunggu Persediaan Alat',
      'Ditunda - Menunggu Persediaan Komponen',
      'Ditunda - Membutuhkan Teknisi Eksternal',
      'Pergantian Teknisi',
      'Alat Tidak Dapat Diperbaiki',
      'Menunggu Alat Baru',
      'Dalam Pengerjaan',
      'Selesai'
    ), allowNull: false },
    technician_uuid: { type: DataTypes.UUID, allowNull: true},
    external_technician: { type: DataTypes.STRING, allowNull: true},
    description: { type: DataTypes.TEXT, allowNull: false},
    documentation: { type: DataTypes.STRING, allowNull: false },
    documentation_url: { type: DataTypes.STRING, allowNull: false}
},{
    timestamps: true,
    tableName: 'progress_inventory_reports',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Progress;