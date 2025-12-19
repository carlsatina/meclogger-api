"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadLogo = void 0;
const multer_1 = __importDefault(require("multer"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
// Filter uploaded file
const storage = multer_1.default.diskStorage({
    destination: function (req, file, callback) {
        // Set the destination file for the uploaded logo for each service.
        if (process.env.NODE_ENV === 'development') {
            callback(null, path_1.default.join(__dirname, '../../uploaded-images/logo'));
        }
        else {
            callback(null, path_1.default.join(__dirname, '../../../uploaded-images/logo'));
        }
    },
    filename: function (req, file, callback) {
        callback(null, Date.now() + '-' + file.originalname);
    }
});
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/webp') {
        cb(null, true);
    }
    else {
        cb("Not an image! Please upload an image", false);
    }
};
const uploadLogo = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 1 * 1024 * 1024, // limit filesize to 1MB
        files: 5
    },
    fileFilter: fileFilter
});
exports.uploadLogo = uploadLogo;
