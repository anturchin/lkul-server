const multer = require('multer');
const { badRequest } = require('boom');
const path = require('path');

// const types = ['.pdf', '.png', '.jpeg', '.jpg', '.doc', '.docx', '.xlsx', '.csv', '.zip'];

const storage = {
    limits: { fileSize: 20 * 1024 * 1024 },
    storage: multer.diskStorage({
        destination: (_req, _file, next) => {
            next(null, './media');
        },
        filename: (_req, file, next) => {
            const ext = path.extname(file.originalname);
            // if (!types.includes(ext)) next(badRequest(ext + ' Неверный формат файла'));
            next( null, `${file.fieldname}-${Date.now()}${ext}`);
        }
    }),
    fileFilter: (_req, file, next) => {
        if (!file) return next(badRequest('Нет файла'));
        return next(null, true);
    }
};

module.exports = multer(storage);
