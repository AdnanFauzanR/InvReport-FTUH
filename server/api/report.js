const express = require('express');
const multer = require('multer');
const path = require('path');
const { Building, Report, Users, Progress } = require('../models')
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');
const fs = require('fs');
const { Op } = require('sequelize');
const generateTicket = require('../util/ticket');
const { drive, uploadToDrive, deleteFolderAndContents, reportsFolderId } = require('./drive');

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

const addReportHandler = async (req, res) => {
    let transaction;
    let reportFolderId = null;
    try {
        const { name, phone_number, location, in_room, out_room, description, latitude, longitude } = req.body;

        if (!isValidPhoneNumber(phone_number)) {
            return res.status(400).json({ error: 'Invalid phone number' });
        }
        if (description.length > 1000) {
            return res.status(400).json({ error: 'Description must be less than 1000 characters' });
        }
        if (!location) {
            return res.status(400).json({ error: 'Location is required' });
        }

        const reportId = uuidv4();
        const ticket = generateTicket();
        transaction = await sequelize.transaction();

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
            report_files: JSON.stringify(req.files.map(f => f.originalname)),
            report_url: "[]"
        }, { transaction });

        // 📁 Buat folder report
        const reportFolder = await drive.files.create({
            requestBody: {
                name: `Report - ${reportId}`,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [reportsFolderId]
            },
            fields: 'id'
        });
        reportFolderId = reportFolder.data.id;

        // 📁 Buat folder progress
        const progressFolder = await drive.files.create({
            requestBody: {
                name: `Progress - ${reportId}`,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [reportFolderId]
            },
            fields: 'id'
        });
        const progressFolderId = progressFolder.data.id;

        const reportFileLinks = [];
        const progressFileLinks = [];
        const reportFilenames = [];
        const progressFilenames = [];


        // 🏞 Upload files ke reportFolder dan progressFolder
        const isMultiple = req.files.length > 1;
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const ext = path.extname(file.originalname);
            const index = isMultiple ? ` ${i + 1}` : '';
            const reportFilename = `Report${index} - ${reportId}${ext}`;
            const progressFilename = `Laporan Masuk${index} - ${reportId}${ext}` 

            // Upload ke reportFolder
            const uploadedReport = await uploadToDrive(file, reportFolderId, reportFilename);
            reportFileLinks.push(`https://drive.google.com/uc?export=view&id=${uploadedReport.id}`);
            reportFilenames.push(reportFilename);

            // Upload ke progressFolder dengan penamaan sama
            const uploadedProgress = await uploadToDrive(file, progressFolderId, progressFilename);
            progressFileLinks.push(`https://drive.google.com/uc?export=view&id=${uploadedProgress.id}`);
            progressFilenames.push(progressFilename);
        }

        // Update file URL di Report
        await Report.update(
            { 
                report_url: JSON.stringify(reportFileLinks),
                report_files: JSON.stringify(reportFilenames)
             },
            { where: { uuid: reportId }, transaction }
        );

        // Simpan Progress
        await Progress.create({
            uuid: uuidv4(),
            report_uuid: reportId,
            status: 'Laporan Masuk',
            description: description,
            documentation: JSON.stringify(progressFilenames),
            documentation_url: JSON.stringify(progressFileLinks)
        }, { transaction });

        await transaction.commit();

        res.status(201).json({
            message: 'Report sent successfully',
            report_id: reportId,
            file_urls: reportFileLinks,
            progress_file_urls: progressFileLinks
        });

    } catch (error) {
        if (transaction) await transaction.rollback();

        // 🧹 Bersihkan folder utama jika terjadi error
        if (reportFolderId) {
            try {
                // Hapus folder utama dan semua isinya
                await deleteFolderAndContents(reportFolderId);
            } catch (cleanupError) {
                console.error('Failed to clean up folder:', cleanupError);
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
            attributes: ['uuid', 'name', 'phone_number', 'location', 'out_room', 'description', 'priority', 'latitude', 'longitude', 'report_files', 'report_url', 'ticket', 'created_at'],
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
            latitude: report.latitude,
            longitude: report.longitude,
            date_report: report.created_at,
            date_last_status: progressMap[report.uuid] ? progressMap[report.uuid].date : null,
            report_files: JSON.parse(report.report_files),
            report_url: JSON.parse(report.report_url),
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
            attributes: ['uuid', 'name', 'phone_number', 'location', 'out_room', 'description', 'priority', 'longitude', 'latitude', 'report_files', 'report_url', 'ticket', 'created_at'],
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
            // Ambil data report yang akan dihapus
            const reports = await Report.findAll({
                where: { uuid: { [Op.in]: uuids } },
                attributes: ['uuid']
            });

            for (const report of reports) {
                const folderName = `Report - ${report.uuid}`;
                try {
                    const res = await drive.files.list({
                        q: `'${reportsFolderId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder'`,
                        fields: 'files(id, name)'
                    });
                    const folder = res.data.files[0];
                    if (folder) {
                        await deleteFolderAndContents(folder.id);
                        console.log(`Google Drive folder deleted: ${folderName}`);
                    } else {
                        console.log(`Google Drive folder not found: ${folderName}`);
                    }
                } catch (err) {
                    console.error(`Error deleting Google Drive folder: ${folderName}`, err);
                }
            }

            // Hapus laporan dari database
            await Report.destroy({ where: { uuid: { [Op.in]: uuids } }, cascade: true });
            res.status(200).json({ message: 'Reports deleted successfully' });

        } else {
            // Jika tidak ada UUID diberikan, hapus semua laporan
            const reports = await Report.findAll({ attributes: ['uuid'] });

            for (const report of reports) {
                const folderName = `Report - ${report.uuid}`;
                try {
                    const res = await drive.files.list({
                        q: `'${reportsFolderId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder'`,
                        fields: 'files(id, name)'
                    });
                    const folder = res.data.files[0];
                    if (folder) {
                        await deleteFolderAndContents(folder.id);
                        console.log(`Google Drive folder deleted: ${folderName}`);
                    } else {
                        console.log(`Google Drive folder not found: ${folderName}`);
                    }
                } catch (err) {
                    console.error(`Error deleting Google Drive folder: ${folderName}`, err);
                }
            }

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
