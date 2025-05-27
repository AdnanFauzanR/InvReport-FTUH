const express = require('express');
const multer = require('multer');
const path = require('path');
const { Building, Report, Users, Progress } = require('../models');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');
const fs = require('fs');
const { Op } = require('sequelize');
const { drive, uploadToDrive, deleteFolderAndContents, reportsFolderId } = require('./drive');

const uploadProgress = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
            return cb(new Error('Only image or video files are allowed'), false);
        }
        cb(null, true);
    }
})

const addProgressHandler = async (req, res) => {
    let transaction;
    let createdFolderId = null; // Untuk menyimpan ID folder Progress-[report_uuid] jika dibuat baru
    const uploadedFileIds = []; // Untuk menyimpan ID file-file yang berhasil diupload ke Drive

    try {
        const { report_uuid, status, technician_uuid, external_technician, description } = req.body;

        if (!report_uuid) return res.status(400).json({ error: 'Report UUID is required' });
        if (!status) return res.status(400).json({ error: 'Status is required' });
        if (!description) return res.status(400).json({ error: 'Description is required' });
        if (description.length > 1000) return res.status(400).json({ error: 'Description must be less than 1000 characters' });
        if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Image/Video is required' });

        const report = await Report.findOne({ where: { uuid: report_uuid } });
        if (!report) return res.status(404).json({ error: 'Report not found' });

        if (technician_uuid) {
            const technician = await Users.findOne({ where: { uuid: technician_uuid } });
            if (!technician) return res.status(404).json({ error: 'Technician not found' });
            if (technician.role !== 'Teknisi') return res.status(403).json({ error: 'User is not authorized as a Technician' });
        }

        transaction = await sequelize.transaction();

        const reportFolderName = `Report - ${report_uuid}`;
        const progressFolderName = `Progress - ${report_uuid}`;

        // Cari folder Report - [report_uuid]
        let reportFolderRes = await drive.files.list({
            q: `'${reportsFolderId}' in parents and name='${reportFolderName}' and mimeType='application/vnd.google-apps.folder'`,
            fields: 'files(id, name)'
        });
        let reportFolderId = reportFolderRes.data.files[0]?.id;
        if (!reportFolderId) {
            return res.status(404).json({ error: `Folder '${reportFolderName}' not found in Google Drive` });
        }

        // Cari atau buat folder Progress - [report_uuid]
        let progressFolderRes = await drive.files.list({
            q: `'${reportFolderId}' in parents and name='${progressFolderName}' and mimeType='application/vnd.google-apps.folder'`,
            fields: 'files(id, name)'
        });
        let progressFolderId = progressFolderRes.data.files[0]?.id;

        if (!progressFolderId) {
            // Buat folder Progress - [report_uuid]
            const folderMetadata = {
                name: progressFolderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [reportFolderId]
            };
            const folder = await drive.files.create({
                resource: folderMetadata,
                fields: 'id'
            });
            progressFolderId = folder.data.id;
            createdFolderId = progressFolderId;
        }

        const fileLinks = [];
        const filenames = [];
        const isMultiple = req.files.length > 1;

        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const ext = path.extname(file.originalname);
            const index = isMultiple ? ` ${i + 1}` : '';
            const filename = `${status}${index} - ${report_uuid}${ext}`;

            const uploadedProgress = await uploadToDrive(file, progressFolderId, filename);
            uploadedFileIds.push(uploadedProgress.id); // Simpan ID file yang berhasil diupload
            fileLinks.push(`https://drive.google.com/uc?export=view&id=${uploadedProgress.id}`);
            filenames.push(filename);
        }

        // Simpan progress ke database
        const progressId = uuidv4();
        await Progress.create({
            uuid: progressId,
            report_uuid,
            status,
            technician_uuid: technician_uuid || null,
            external_technician: external_technician || null,
            description,
            documentation: JSON.stringify(filenames),
            documentation_url: JSON.stringify(fileLinks)
        }, { transaction });

        // Update Report
        const updateData = { progress_uuid: progressId };
        if (technician_uuid) updateData.technician_uuid = technician_uuid;
        await Report.update(updateData, { where: { uuid: report_uuid }, transaction });

        await transaction.commit();

        res.status(201).json({
            message: 'Progress sent successfully',
            progressId,
            reportId: report_uuid,
            documentation_url: fileLinks
        });

    } catch (error) {
        if (transaction) await transaction.rollback();

        // Hapus semua file yang sudah diupload ke Drive jika terjadi error
        for (const fileId of uploadedFileIds) {
            try {
                await drive.files.delete({ fileId });
            } catch (err) {
                console.error(`Failed to delete uploaded file with ID ${fileId}:`, err);
            }
        }

        // Hapus folder Progress-[report_uuid] jika baru dibuat dan gagal
        if (createdFolderId) {
            try {
                await drive.files.delete({ fileId: createdFolderId });
            } catch (err) {
                console.error('Failed to delete newly created Progress folder:', err);
            }
        }

        console.error('Error adding progress:', error);
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
            documentation: JSON.parse(progress.documentation),
            documentation_url: JSON.parse(progress.documentation_url),
            progress_date: progress.created_at
        }));
        
        res.status(200).json(formattedProgress);
    } catch (error) {
        console.error('Error getting report:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

const updateProgressHandler = async (req, res) => {
    try {
        const { uuid } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status must be selected' });
        }

        const updateProgress = await Progress.update(
            { status: status },
            { where: { uuid: uuid }}
        )

        res.status(200).json({ message: 'Progress Status Updated Successfully' });
    } catch (error) {
        console.error('Error updating progress status', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

// Delete Progress Report
const deleteProgressHandler = async (req, res) => {
    try {
        const { uuids } = req.body;
        const { report_uuid } = req.query;

        let progressRecords = [];

        if (Array.isArray(uuids) && uuids.length > 0 && !report_uuid) {
            // Ambil data progress yang akan dihapus
            progressRecords = await Progress.findAll({
                where: { uuid: { [Op.in]: uuids } },
                attributes: ['uuid', 'documentation', 'report_uuid', 'updated_at']
            });

            for (const progress of progressRecords) {
                const { uuid, report_uuid } = progress;

                // Cek apakah report terkait memiliki progress_uuid == uuid yang akan dihapus
                const report = await Report.findOne({ where: { uuid: report_uuid, progress_uuid: uuid } });
                if (report) {
                    const nextProgress = await Progress.findOne({
                        where: {
                            report_uuid,
                            uuid: { [Op.not]: uuid }
                        },
                        order: [['updated_at', 'DESC']]
                    });
                    await report.update({ progress_uuid: nextProgress ? nextProgress.uuid : null });
                }

                // Hapus progress
                await Progress.destroy({ where: { uuid: progress.uuid } });

            }

        } else if (!uuids && report_uuid) {
            // Hapus semua progress untuk report_uuid tertentu
            progressRecords = await Progress.findAll({
                where: { report_uuid },
                attributes: ['uuid', 'documentation', 'report_uuid']
            });

            // Hapus folder dan file Google Drive
            const reportFolderName = `Report - ${report_uuid}`;
            const progressFolderName = `Progress - ${report_uuid}`;

            const reportFolderRes = await drive.files.list({
                q: `'${reportsFolderId}' in parents and name='${reportFolderName}' and mimeType='application/vnd.google-apps.folder'`,
                fields: 'files(id, name)'
            });
            const reportFolderId = reportFolderRes.data.files[0]?.id;

            if (reportFolderId) {
                const progressFolderRes = await drive.files.list({
                    q: `'${reportFolderId}' in parents and name='${progressFolderName}' and mimeType='application/vnd.google-apps.folder'`,
                    fields: 'files(id, name)'
                });
                const progressFolderId = progressFolderRes.data.files[0]?.id;

                if (progressFolderId) {
                    const allFilesRes = await drive.files.list({
                        q: `'${progressFolderId}' in parents`,
                        fields: 'files(id, name)'
                    });
                    const allFiles = allFilesRes.data.files;
                    for (const file of allFiles) {
                        try {
                            await drive.files.delete({ fileId: file.id });
                            console.log(`Deleted file '${file.name}' from Google Drive`);
                        } catch (err) {
                            console.error(`Error deleting file '${file.name}' from Google Drive:`, err);
                        }
                    }
                } else {
                    console.warn(`Folder '${progressFolderName}' not found in Google Drive`);
                }
            } else {
                console.warn(`Folder '${reportFolderName}' not found in Google Drive`);
            }

            // Hapus progress di DB
            await Progress.destroy({ where: { report_uuid } });

            // Update report untuk hapus last status
            await Report.update({ progress_uuid: null }, { where: { report_uuid } });

        } else if (!uuids && !report_uuid) {
            // Hapus semua progress
            progressRecords = await Progress.findAll({
                attributes: ['uuid', 'documentation', 'report_uuid']
            });

            await Progress.destroy({ where: {} });

            // Set semua progress_uuid di reports jadi null
            await Report.update({ progress_uuid: null }, { where: {} });

        } else {
            return res.status(400).json({ error: 'Invalid request. Provide either uuids or report_uuid, not both.' });
        }

        // Hapus file progress yang terkait
        for (const item of progressRecords) {
            if (item.documentation) {
                const filenames = JSON.parse(item.documentation);
                const reportFolderName = `Report - ${item.report_uuid}`;
                const progressFolderName = `Progress - ${item.report_uuid}`;

                const reportFolderRes = await drive.files.list({
                    q: `'${reportsFolderId}' in parents and name='${reportFolderName}' and mimeType='application/vnd.google-apps.folder'`,
                    fields: 'files(id, name)'
                });
                const reportFolderId = reportFolderRes.data.files[0]?.id;
                if (!reportFolderId) continue;

                const progressFolderRes = await drive.files.list({
                    q: `'${reportFolderId}' in parents and name='${progressFolderName}' and mimeType='application/vnd.google-apps.folder'`,
                    fields: 'files(id, name)'
                });
                const progressFolderId = progressFolderRes.data.files[0]?.id;
                if (!progressFolderId) continue;

                for (const filename of filenames) {
                    try {
                        const fileRes = await drive.files.list({
                            q: `'${progressFolderId}' in parents and name='${filename}'`,
                            fields: 'files(id, name)'
                        });
                        const fileId = fileRes.data.files[0]?.id;
                        if (fileId) {
                            await drive.files.delete({ fileId });
                            console.log(`Deleted file '${filename}' from Google Drive`);
                        }
                    } catch (err) {
                        console.error(`Error deleting file '${filename}' from Google Drive:`, err);
                    }
                }
            }
        }

        return res.status(200).json({ message: 'Progress deleted successfully' });

    } catch (error) {
        console.error('Error deleting progress:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};

module.exports = {
    uploadProgress,
    addProgressHandler,
    getProgressHandler,
    updateProgressHandler,
    deleteProgressHandler
};