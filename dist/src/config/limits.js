"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUEST_BODY_LIMIT = exports.MEDICAL_RECORD_MAX_TOTAL_BYTES = exports.MEDICAL_RECORD_MAX_FILE_BYTES = exports.MEDICAL_RECORD_MAX_TOTAL_MB = exports.MEDICAL_RECORD_MAX_FILE_MB = exports.MEDICAL_RECORD_MAX_FILES = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const MB = 1024 * 1024;
const parsePositiveNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
exports.MEDICAL_RECORD_MAX_FILES = parsePositiveNumber(process.env.MEDICAL_RECORD_MAX_FILES, 5);
exports.MEDICAL_RECORD_MAX_FILE_MB = parsePositiveNumber(process.env.MEDICAL_RECORD_MAX_FILE_MB, 10);
exports.MEDICAL_RECORD_MAX_TOTAL_MB = parsePositiveNumber(process.env.MEDICAL_RECORD_MAX_TOTAL_MB, exports.MEDICAL_RECORD_MAX_FILE_MB * exports.MEDICAL_RECORD_MAX_FILES);
exports.MEDICAL_RECORD_MAX_FILE_BYTES = exports.MEDICAL_RECORD_MAX_FILE_MB * MB;
exports.MEDICAL_RECORD_MAX_TOTAL_BYTES = exports.MEDICAL_RECORD_MAX_TOTAL_MB * MB;
exports.REQUEST_BODY_LIMIT = process.env.REQUEST_BODY_LIMIT || `${exports.MEDICAL_RECORD_MAX_TOTAL_MB}mb`;
