const { google } = require('googleapis');
const streamifier = require('streamifier');

// 🔑 Load Service Account Credential
const KEYFILEPATH = '../fleet-automata-461006-t0-872d348132d0.json'
const SCOPES = ['https://www.googleapis.com/auth/drive'];

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES
});
const drive = google.drive({ version: 'v3', auth });

// 📁 ID folder utama Reports di Google Drive (buat manual di Drive, lalu copy ID-nya)
const reportsFolderId = '1thaysFIjn40V8n8qwjk_g4L4P9vTjo1A';

const uploadToDrive = async (file, folderId, customFileName) => {
    const stream = streamifier.createReadStream(file.buffer);
    const res = await drive.files.create({
        requestBody: {
            name: customFileName,
            parents: [folderId]
        },
        media: {
            mimeType: file.mimetype,
            body: stream
        },
        fields: 'id, name, webViewLink' 
    });

    const fileId = res.data.id;
    await setFilePublic(fileId);

    return res.data;
};

const setFilePublic = async (fileId) => {
    await drive.permissions.create({
        fileId: fileId,
        requestBody: {
            role: 'reader',
            type: 'anyone'
        }
    });
};

const deleteFolderAndContents = async (folderId) => {
    try {
        const res = await drive.files.list({
            q: `'${folderId}' in parents`,
            fields: 'files(id, name)'
        });
        const files = res.data.files;
        for (const file of files) {
            await drive.files.delete({ fileId: file.id }); 
        }
        await drive.files.delete({ fileId: folderId });
    } catch (error) {
        console.error('Error deleting folder contents: ', error);
    }
};

module.exports = {
    drive,
    uploadToDrive,
    deleteFolderAndContents,
    reportsFolderId
}