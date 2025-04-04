const express = require('express');
const multer = require('multer');
const path = require('path');
const { Building, Report, Users, Progress } = require('../models');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');
const fs = require('fs');
const { Op } = require('sequelize');

const uploadProgress = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
            return cb(new Error('Only image or video files are allowed'), false);
        }
        cb(null, true);
    }
})

// Add Progress
const addProgressHandler = async(req, res) => {
    let transaction;
    let filePath;
    try {
        const { report_uuid, status, technician_uuid, external_technician, description } = req.body;
        
        if (!report_uuid) {
            return res.status(400).json({ error: 'Report UUID is required' });
        }

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        if (!description) {
            return res.status(400).json( { error: 'Description is required' });
        } else if (description.length > 1000) {
            return res.status(400).json({ error: 'Description must be less than 1000 characters' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Image/Video is required' });
        }

        const report = await Report.findOne({
            where: { uuid: report_uuid }
        })

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        if (technician_uuid) {
            const technician = await Users.findOne({
                where: { uuid: technician_uuid }
            })
    
            if (!technician) {
                return res.status(404).json({ error: 'Technician not found' });
            }
    
            if (technician.role !== 'Teknisi') {
                return res.status(403).json({ error: 'User is not authorized as a Technician' });
            }
        }
        
        const progressId = uuidv4();
        transaction = await sequelize.transaction();

        const uploadPath = path.join(__dirname, '..', 'public', 'uploads', 'progress');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        // Simpan file sementara sebelum commit transaksi
        const filename = `${uuidv4()}${path.extname(req.file.originalname)}`;
        filePath = path.join(uploadPath, filename);
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/progress/${filename}`; // Buat URL
        fs.writeFileSync(filePath, req.file.buffer);

        const newProgress = await Progress.create({
            uuid: progressId,
            report_uuid: report_uuid,
            status: status,
            technician_uuid: technician_uuid ? technician_uuid : null,
            external_technician: external_technician ? external_technician : null,
            description: description,
            documentation: filePath,
            documentation_url: fileUrl

        }, { transaction });

        const updateData = { progress_uuid: progressId };

        if (technician_uuid) {
            updateData.technician_uuid = technician_uuid;
        }

        const updateReport = await Report.update(
            updateData,
            { where: { uuid: report_uuid }, transaction }
        );

        await transaction.commit();

        res.status(201).json({
            message: 'Progress sent successfully',
            progressId: progressId,
            reportId:  report_uuid,
            documentation_url: fileUrl
        })
    } catch (error) {
        if (transaction) await transaction.rollback();

        if (filePath && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (fsError) {
                console.error('Failed to delete file: ', fsError);
            }
        }

        console.error('Error inserting progress: ', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};

// Get Progress Report
const getProgressHandler = async (req, res) => {
    try {
        const { report_uuid } = req.query;
        
        const queryOptions = {
            attributes: ['uuid', 'status', 'description', 'external_technician', 'documentation', 'documentation_url', 'created_at'],
            include: [
                {
                    model: Users,
                    as: 'Technician',
                    attributes: ['name']
                }
            ],
            where: {}
        }

        if (report_uuid) {
            queryOptions.where['report_uuid'] = report_uuid;
            queryOptions.order = [['created_at', 'DESC']];
        }

        const progress = await Progress.findAll(queryOptions);

        if (!progress || progress.length === 0) {
            return res.status(404).json({ error: 'No data found' });
        }

        const formattedProgress = progress.map(progress => ({
            uuid: progress.uuid,
            report_uuid: progress.report_uuid,
            status: progress.status,
            technician_name: progress.Technician ? progress.Technician.name : null,
            external_technician: progress.external_technician,
            description: progress.description,
            documentation: progress.documentation,
            documentation_url: progress.documentation_url,
            progress_date: progress.created_at
        }));
        
        res.status(200).json(formattedProgress);
    } catch (error) {
        console.error('Error getting report:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

// Delete Progress Report
const deleteProgressHandler = async (req, res) => {
    try {
        const { uuids } = req.body;
        const { report_uuid } = req.query;

        if (Array.isArray(uuids) && uuids.length > 0 && !report_uuid) {
            // Hapus berdasarkan uuids
            const progress = await Progress.findAll({
                where: { uuid: { [Op.in]: uuids } },
                attributes: ['documentation']
            });

            progress.forEach(item => {
                if (item.documentation && fs.existsSync(item.documentation)) {
                    try {
                        fs.unlinkSync(item.documentation);
                        console.log(`File deleted: ${item.documentation}`);
                    } catch (fsError) {
                        console.error(`Error deleting file: ${item.documentation}`, fsError);
                    }
                }
            });

            await Progress.destroy({ where: { uuid: { [Op.in]: uuids } } });
            return res.status(200).json({ message: 'Progress deleted successfully' });
        } 
        else if (!uuids && report_uuid) {
            // Hapus berdasarkan report_uuid
            const progress = await Progress.findAll({
                where: { report_uuid },
                attributes: ['documentation']
            });

            progress.forEach(item => {
                if (item.documentation && fs.existsSync(item.documentation)) {
                    try {
                        fs.unlinkSync(item.documentation);
                        console.log(`File deleted: ${item.documentation}`);
                    } catch (fsError) {
                        console.error(`Error deleting file: ${item.documentation}`, fsError);
                    }
                }
            });

            await Progress.destroy({ where: { report_uuid } });
            return res.status(200).json({ message: 'Progress deleted successfully' });
        } 
        else if (!uuids && !report_uuid) {
            // Hapus semua data jika tidak ada parameter yang diberikan
            const progress = await Progress.findAll({ attributes: ['documentation'] });

            progress.forEach(item => {
                if (item.documentation && fs.existsSync(item.documentation)) {
                    try {
                        fs.unlinkSync(item.documentation);
                        console.log(`File deleted: ${item.documentation}`);
                    } catch (fsError) {
                        console.error(`Error deleting file: ${item.documentation}`, fsError);
                    }
                }
            });

            await Progress.destroy({ where: {} });
            return res.status(200).json({ message: 'All progress deleted successfully' });
        } 
        else {
            return res.status(400).json({ error: 'Invalid request. Provide either uuids or report_uuid, not both.' });
        }
    } catch (error) {
        console.error('Error deleting progress:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};

module.exports = {
    uploadProgress,
    addProgressHandler,
    getProgressHandler,
    deleteProgressHandler
};