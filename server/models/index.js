const sequelize = require('../config/db');
const Building = require('./building');
const Report = require('./report');
const Users = require('./users');
const Progress = require('./progress');

Building.hasMany(Report, { foreignKey: 'in_room_uuid', as: 'Reports' });
Report.belongsTo(Building, { foreignKey: 'in_room_uuid', targetKey: 'uuid', as: 'Building' });

Users.hasMany(Report, { foreignKey: 'technician_uuid', as: 'Reports' });
Report.belongsTo(Users, { foreignKey: 'technician_uuid', targetKey: 'uuid', as: 'Technician' });

Users.hasMany(Progress, { foreignKey: 'technician_uuid', as: 'Progress'});
Progress.belongsTo(Users, { foreignKey: 'technician_uuid', targetKey: 'uuid', as: 'Technician'});

Report.hasMany(Progress, { foreignKey: 'report_uuid', as: 'Progress'});
Progress.belongsTo(Report, { foreignKey: 'report_uuid', targetKey: 'uuid', as: 'Reports'})

module.exports = { sequelize, Building, Report, Users, Progress};