const Progress = require('./progress');
const Report = require('./report');
const Building = require('./building');
const Users = require('./users');

// 1️⃣ Building memiliki banyak Report
Building.hasMany(Report, { foreignKey: 'in_room_uuid', as: 'Reports' });
Report.belongsTo(Building, { foreignKey: 'in_room_uuid', targetKey: 'uuid', as: 'Building' });

// 2️⃣ Users (Technician) memiliki banyak Report
Users.hasMany(Report, { foreignKey: 'technician_uuid', as: 'Reports' });
Report.belongsTo(Users, { foreignKey: 'technician_uuid', targetKey: 'uuid', as: 'Technician' });

// 3️⃣ Users (Technician) memiliki banyak Progress
Users.hasMany(Progress, { foreignKey: 'technician_uuid', as: 'Progress' });
Progress.belongsTo(Users, { foreignKey: 'technician_uuid', targetKey: 'uuid', as: 'Technician' });

// 4️⃣ Report memiliki banyak Progress (Histori Progress)
Report.hasMany(Progress, { foreignKey: 'report_uuid', sourceKey: 'uuid', as: 'Progress' });
Progress.belongsTo(Report, { foreignKey: 'report_uuid', targetKey: 'uuid', as: 'Report' });

module.exports = { Building, Report, Users, Progress};