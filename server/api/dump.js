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