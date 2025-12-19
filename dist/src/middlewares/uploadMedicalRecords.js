"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const limits_1 = require("../config/limits");
const uploadMedicalRecordFiles = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: limits_1.MEDICAL_RECORD_MAX_FILE_BYTES,
        files: limits_1.MEDICAL_RECORD_MAX_FILES
    }
});
exports.default = uploadMedicalRecordFiles;
