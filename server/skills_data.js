const { Client } = require('pg');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

const insertSkills = async (dataList) => {
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        await client.connect();

        if (!Array.isArray(dataList) || dataList.length === 0) {
            throw new Error("Data list must be array and not empty");
        }

        const tableName = 'skills';
        const columns = ['uuid', 'name'];

        const updatedDataList = dataList.map(skillName => [uuidv4(), skillName]);

        const columnNames = columns.join(', ');

        const valuesPlaceholder = updatedDataList.map(
            (_, index) => `(${columns.map((_, colIdx) => `$${index * columns.length + colIdx + 1}`).join(', ')})`
        ).join(', ');
        const queryText = `INSERT INTO ${tableName} (${columnNames}) VALUES ${valuesPlaceholder}`;
        const queryValues = updatedDataList.flat();

        await client.query(queryText, queryValues);
        console.log('Data inserted successfully to table: ', tableName);
    } catch (error) {
        console.log('Error: ', error.message);
    } finally {
        await client.end();
    }
};

// Contoh data skills
const skillList = [
    'Electrical',
    'Mechanical',
    'Networking',
    'Plumbing',
    'HVAC',
    'Welding',
    'Carpentry',
    'Painting',
    'Masonry',
    'CCTV Installation',
    'Elevator Maintenance',
    'Fire Safety',
    'Security Systems'
];

insertSkills(skillList);
