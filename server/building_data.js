const { Client } = require('pg');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');


const insertData = async (tableName, columns, dataList) => {
    
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

        const updatedColumns = ['uuid', ...columns];

        const updatedDataList = dataList.map(row => [uuidv4(), ...row]);

        const columnNames = updatedColumns.join(', ');

        const valuesPlaceholder = updatedDataList.map(
            (_, index) => `(${updatedColumns.map((_, colIdx) => `$${index * updatedColumns.length + colIdx + 1}`).join(', ')})`
        ).join(', ');
        const queryText = `INSERT INTO ${tableName} (${columnNames}) VALUES ${valuesPlaceholder}`;
        const queryValues = updatedDataList.flat();

        await client.query(queryText, queryValues);
        console.log('Data inserted successfully to tabel: ', tableName);
    } catch(error) {
        console.log('Error: ', error.message);
    } finally {
        await client.end();
    }
};

const tableName = 'building';
const columns = ['building_name'];
const dataList = [
    ['COT'], 
    ['CSA'], 
    ['Classroom'], 
    ['Gedung Arsitektur'], 
    ['Gedung Mesin'], 
    ['Gedung Sipil'], 
    ['Gedung Geologi'], 
    ['Gedung Perkapalan'], 
    ['Gedung Elektro'], 
    ['Masjid'], 
    ['Gedung X Indah Karya'], 
    ['TPS 3R'], 
    ['Power House'], 
    ['Gedung Workshop'], 
    ['Cafe Insinyur'], 
    ['Techno Mart'], 
    ['Kantor Satpam'], 
    ['Gedung IPAL'], 
    ['Asrama Teknik']
]

insertData(tableName, columns, dataList);