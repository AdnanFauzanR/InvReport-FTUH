const express = require('express');
const multer = require('multer');
const path = require('path');
const { Building, Report, Users, Progress } = require('../models')
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');
const fs = require('fs');
const { Op } = require('sequelize');
const generateTicket = require('../util/ticket');

const uploadReport = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
            return cb(new Error('Only image or video files are allowed'), false);
        }
        cb(null, true);
    }
});

// Telephone Number Validation
const isValidPhoneNumber = (number) => {
    return /^\+?[0-9]{10,15}$/.test(number);
};

// Add Report
const addReportHandler = async (req, res) => {
    let transaction;
    const savedFilePaths = [];

    try {
        const { name, phone_number, location, in_room, out_room, description, latitude, longitude } = req.body;

        // Validasi manual
        if (!isValidPhoneNumber(phone_number)) {
            return res.status(400).json({ error: 'Invalid phone number' });
        }
        if (description.length > 1000) {
            return res.status(400).json({ error: 'Description must be less than 1000 characters' });
        }
        if (!location) {
            return res.status(400).json({ error: 'Location is required' });
        }

        // Validasi khusus lokasi
        if (location === 'In Room' && (!in_room || in_room.trim() === '')) {
            return res.status(400).json({ error: 'Specific Location (in_room) is required for In Room' });
        }
        if (location === 'Out Room' && (!out_room || out_room.trim() === '')) {
            return res.status(400).json({ error: 'Specific Location (out_room) is required for Out Room' });
        }

        // Validasi file
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'At least one image/video is required' });
        }
        if (req.files.length > 5) {
            return res.status(400).json({ error: 'You can upload up to 5 files only' });
        }

        const reportId = uuidv4();
        const ticket = generateTicket();
        transaction = await sequelize.transaction();

        const uploadReportPath = path.join(__dirname, '..', 'public', 'uploads', 'reports');
        if (!fs.existsSync(uploadReportPath)) {
            fs.mkdirSync(uploadReportPath, { recursive: true });
        }

        const uploadProgressPath = path.join(__dirname, '..', 'public', 'uploads', 'progress');
        if (!fs.existsSync(uploadProgressPath)) {
            fs.mkdirSync(uploadProgressPath, { recursive: true });
        }

        const filenames = [];
        const reportUrls = [];
        const progressUrls = [];

        for (const file of req.files) {
            const filename = `${uuidv4()}${path.extname(file.originalname)}`;
            const reportFilePath = path.join(uploadReportPath, filename);
            const reportUrl = `${req.protocol}://${req.get('host')}/uploads/reports/${filename}`;
            const progressFilePath = path.join(uploadProgressPath, filename);
            const progressUrl = `${req.protocol}://${req.get('host')}/uploads/progress/${filename}`;

            fs.writeFileSync(reportFilePath, file.buffer);
            fs.writeFileSync(progressFilePath, file.buffer);

            savedFilePaths.push(reportFilePath, progressFilePath); // Track for potential cleanup

            filenames.push(filename);
            reportUrls.push(reportUrl);
            progressUrls.push(progressUrl);
        }

        // Insert ke database
        await Report.create({
            uuid: reportId,
            name,
            phone_number,
            location,
            in_room_uuid: in_room || null,
            out_room: out_room || null,
            description,
            latitude: latitude || null,
            longitude: longitude || null,
            ticket: ticket,
            report_files: JSON.stringify(filenames),
            report_url: JSON.stringify(reportUrls)
        }, { transaction });

        await Progress.create({
            uuid: uuidv4(),
            report_uuid: reportId,
            status: 'Laporan Masuk',
            description: description,
            documentation: JSON.stringify(filenames),
            documentation_url: JSON.stringify(progressUrls)
        }, { transaction });

        await transaction.commit();

        res.status(201).json({
            message: 'Report sent successfully',
            report_id: reportId,
            file_urls: reportUrls
        });

    } catch (error) {
        if (transaction) await transaction.rollback();

        // Hapus file jika gagal
        for (const filePath of savedFilePaths) {
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch (fsErr) {
                    console.error('Failed to delete file:', fsErr);
                }
            }
        }

        console.error('Error inserting report:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};


// Get Report
const getReportsHandler = async (req, res) => {
    try {
        const { building, technician_uuid, ticket, limit } = req.query;

        const queryOptions = {
            attributes: ['uuid', 'name', 'phone_number', 'location', 'out_room', 'description', 'priority', 'report_files', 'report_url', 'ticket', 'created_at'],
            include: [
                {
                    model: Building,
                    as: 'Building',
                    attributes: ['building_name']
                },
                {
                    model: Users,
                    as: 'Technician',
                    attributes: ['name']
                }
            ],
            where: {}
        };

        // Tentukan order berdasarkan ada tidaknya limit
        if (limit && !isNaN(limit)) {
            queryOptions.order = [['created_at', 'DESC']]; // Data terbaru dulu
            queryOptions.limit = parseInt(limit);
        } else {
            queryOptions.order = [['created_at', 'ASC']]; // Data terlama dulu
        }

        if (building) {
            if (building === 'Fakultas') {
                queryOptions.where[Op.or] = [
                    {
                        '$Building.building_name$': {
                            [Op.notIn]: ['Gedung Elektro', 'Gedung Arsitektur', 'Gedung Perkapalan', 'Gedung Geologi', 'Gedung Sipil', 'Gedung Mesin']
                        }
                    },
                    { location: 'Out Room' }
                ];
            } else {
                queryOptions.where['$Building.building_name$'] = building;
            }
        }

        if (technician_uuid) {
            queryOptions.where['technician_uuid'] = technician_uuid;
        }

        if (ticket) {
            queryOptions.where['ticket'] = ticket;
        }

        const reports = await Report.findAll(queryOptions);

        if (!reports || reports.length === 0) {
            return res.status(404).json({ error: 'No data found' });
        }

        const reportUuids = reports.map(report => report.uuid);
        const progressData = await Progress.findAll({
            attributes: ['status', 'created_at', 'report_uuid'],
            where: {
                report_uuid: {
                    [Op.in]: reportUuids
                }
            },
            order: [['created_at', 'DESC']]
        });

        const progressMap = {};
        progressData.forEach(progress => {
            const reportId = progress.report_uuid;
            if (!progressMap[reportId]) {
                progressMap[reportId] = {
                    status: progress.status,
                    date: progress.created_at
                };
            }
        });

        const formattedReports = reports.map(report => ({
            uuid: report.uuid,
            name: report.name,
            phone_number: report.phone_number,
            location: report.location,
            building_name: report.Building ? report.Building.building_name : null,
            out_room: report.out_room ? report.out_room : null,
            technician_name: report.Technician ? report.Technician.name : null,
            description: report.description,
            last_status: progressMap[report.uuid] ? progressMap[report.uuid].status : null,
            priority: report.priority,
            date_report: report.created_at,
            date_last_status: progressMap[report.uuid] ? progressMap[report.uuid].date : null,
            report_files: report.report_files,
            report_url: report.report_url,
            ticketing: report.ticket
        }));

        res.status(200).json(formattedReports);
    } catch (error) {
        console.error('Error getting report:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};


const detailReportHandler = async (req, res) => {
    try {
        const { uuid, ticket } = req.query;

        const queryOptions = {
            attributes: ['uuid', 'name', 'phone_number', 'location', 'out_room', 'description', 'priority', 'report_files', 'report_url', 'ticket', 'created_at'],
            include: [
                {
                    model: Building,
                    as: 'Building',
                    attributes: ['building_name']
                },
                {
                    model: Users,
                    as: 'Technician',
                    attributes: ['name']
                }
            ],
            where: {} 
        };

        if (uuid) {
            queryOptions.where['uuid'] = uuid;
        } else if (ticket) {
            queryOptions.where['ticket'] = ticket;
        } else {
            res.status(400).json({ error: 'uuid or ticket is required' });
        }

        const report = await Report.findOne(queryOptions);

        if (!report) {
            res.status(404).json({ error: 'No data found' });
        }

        const progress = await Progress.findAll({
            attributes: ['status', 'created_at', 'report_uuid'],
            where: {
                report_uuid: report.uuid
            },
            order: [['created_at', 'DESC']],
            limit: 1,
            subQuery: false
        });

        const latestProgress = progress ? progress[0] : null;
       
        const formattedReport = {
            uuid: report.uuid,
            name: report.name,
            phone_number: report.phone_number,
            location: report.location,
            building_name: report.Building ? report.Building.building_name : null,
            out_room: report.out_room ? report.out_room : null,
            technician_name: report.Technician ? report.Technician.name : null,
            description: report.description,
            last_status: latestProgress ? latestProgress.status : null,
            priority: report.priority,
            date_report: report.created_at,
            date_last_status: latestProgress ? latestProgress.created_at : null,
            report_files: report.report_files,
            report_url: report.report_url,
            ticketing: report.ticket
        }

        res.status(200).json(formattedReport);
    } catch(error) {
        console.error('Error getting report:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

// Update Report
const updateReportHandler = async (req, res) => {
    try {
        const { uuid } = req.params;
        const { technician_uuid, priority } = req.body;

        // Cek apakah setidaknya salah satu field disediakan
        if (!technician_uuid && !priority) {
            return res.status(400).json({ error: 'At least technician_uuid or priority must be provided' });
        }

        const updateFields = {};
        // Validasi dan tambahkan technician_uuid jika diberikan
        if (technician_uuid) {
            const technician = await Users.findOne({
                where: { uuid: technician_uuid }
            });

            if (!technician) {
                return res.status(404).json({ error: 'Technician not found' });
            }

            if (technician.role !== 'Teknisi') {
                return res.status(403).json({ error: 'User is not authorized as a Technician' });
            }

            updateFields.technician_uuid = technician_uuid;
        }

        // Tambahkan priority jika diberikan
        if (priority) {
            updateFields.priority = priority;
        }

        // Lakukan update hanya dengan field yang tersedia
        const [updatedRowsCount] = await Report.update(updateFields, {
            where: { uuid: uuid }
        });

        if (updatedRowsCount === 0) {
            return res.status(404).json({ error: 'Report not found or nothing changed' });
        }

        res.status(200).json({
            message: 'Report updated successfully',
        });
    } catch (error) {
        console.error('Error updating report:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};


// Delete Report
const deleteReportsHandler = async (req, res) => {
    try {
        const { uuids } = req.body;

        if (uuids && uuids.length > 0) {
            // Ambil data report sebelum dihapus untuk mendapatkan path file
            const reports = await Report.findAll({
                where: { uuid: { [Op.in]: uuids } },
                attributes: ['report_files']
            });

            // Hapus file jika ada
            reports.forEach(report => {
                if (report.report_files && fs.existsSync(report.report_files)) {
                    try {
                        fs.unlinkSync(report.report_files);
                        console.log(`File deleted: ${report.report_files}`);
                    } catch (err) {
                        console.error(`Error deleting file: ${report.report_files}`, err);
                    }
                }
            });

            // Hapus laporan dari database
            await Report.destroy({ where: { uuid: { [Op.in]: uuids } }, cascade: true });

            res.status(200).json({ message: 'Reports deleted successfully' });
        } else {
            // Jika tidak ada UUID diberikan, hapus semua laporan
            const reports = await Report.findAll({ attributes: ['report_files'] });

            // Hapus semua file di folder uploads/reports
            reports.forEach(report => {
                if (report.report_files && fs.existsSync(report.report_files)) {
                    try {
                        fs.unlinkSync(report.report_files);
                        console.log(`File deleted: ${report.report_files}`);
                    } catch (err) {
                        console.error(`Error deleting file: ${report.report_files}`, err);
                    }
                }
            });

            // Hapus semua laporan dari database
            await Report.destroy({ where: {}, cascade: true });

            res.status(200).json({ message: 'All reports deleted successfully' });
        }
    } catch (error) {
        console.error('Error deleting report:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};

module.exports = {
    uploadReport,
    addReportHandler,
    getReportsHandler,
    detailReportHandler,
    updateReportHandler,
    deleteReportsHandler,
};
