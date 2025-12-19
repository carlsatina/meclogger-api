"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImageToStorage = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const MAX_IMAGE_BYTES = 1 * 1024 * 1024; // 1MB
const imageMimeMap = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif'
};
const sanitizeFileName = (name) => {
    const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const trimmed = cleaned.replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
    return trimmed || 'upload';
};
const getExtFromMime = (mime) => imageMimeMap[mime] || 'bin';
const processImageIfNeeded = (file) => __awaiter(void 0, void 0, void 0, function* () {
    const isImage = Boolean(imageMimeMap[file.mimetype]);
    if (!isImage || file.size <= MAX_IMAGE_BYTES) {
        return {
            buffer: file.buffer,
            mimeType: file.mimetype,
            extension: getExtFromMime(file.mimetype),
            originalName: file.originalname
        };
    }
    try {
        const sharp = (yield Promise.resolve().then(() => __importStar(require('sharp')))).default;
        const maxDimension = 1800;
        const qualities = [80, 65, 50];
        let output = null;
        for (const quality of qualities) {
            const candidate = yield sharp(file.buffer)
                .rotate()
                .resize({ width: maxDimension, height: maxDimension, fit: 'inside' })
                .webp({ quality })
                .toBuffer();
            output = candidate;
            if (candidate.byteLength <= MAX_IMAGE_BYTES)
                break;
        }
        if (!output) {
            output = file.buffer;
        }
        return {
            buffer: output,
            mimeType: 'image/webp',
            extension: 'webp',
            originalName: file.originalname
        };
    }
    catch (e) {
        // If processing fails, fall back to original buffer
        console.warn('Image processing failed, using original buffer', e);
        return {
            buffer: file.buffer,
            mimeType: file.mimetype,
            extension: getExtFromMime(file.mimetype),
            originalName: file.originalname
        };
    }
});
const writeToLocalDisk = (file, folder, processed) => __awaiter(void 0, void 0, void 0, function* () {
    const uploadDir = path_1.default.resolve(process.cwd(), 'uploaded-images', folder);
    yield fs_1.promises.mkdir(uploadDir, { recursive: true });
    const base = sanitizeFileName(path_1.default.parse(processed.originalName).name);
    const filename = `${Date.now()}-${base}.${processed.extension}`;
    const filePath = path_1.default.join(uploadDir, filename);
    yield fs_1.promises.writeFile(filePath, processed.buffer);
    return {
        url: `/${folder}/${filename}`,
        provider: 'local'
    };
});
const uploadToVercelBlob = (file, folder, token, processed) => __awaiter(void 0, void 0, void 0, function* () {
    const uniqueSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const base = sanitizeFileName(path_1.default.parse(processed.originalName).name);
    const filename = `${uniqueSuffix}-${base}.${processed.extension}`;
    const key = `${folder}/${filename}`;
    const { put } = yield Promise.resolve().then(() => __importStar(require('@vercel/blob')));
    const blob = yield put(key, processed.buffer, {
        access: 'public',
        token,
        contentType: processed.mimeType,
        addRandomSuffix: false
    });
    const result = { url: blob.url, provider: 'vercel-blob' };
    return result;
});
const uploadImageToStorage = (file_1, ...args_1) => __awaiter(void 0, [file_1, ...args_1], void 0, function* (file, folder = 'vehicles') {
    const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
    if (!(file === null || file === void 0 ? void 0 : file.buffer) || !file.originalname) {
        throw new Error('Invalid file upload payload');
    }
    const processed = yield processImageIfNeeded(file);
    if (token) {
        try {
            return yield uploadToVercelBlob(file, folder, token, processed);
        }
        catch (error) {
            // Fall back to local disk when blob upload is not available (e.g., local dev).
            console.warn('Vercel Blob upload failed, falling back to local storage', error);
        }
    }
    return writeToLocalDisk(file, folder, processed);
});
exports.uploadImageToStorage = uploadImageToStorage;
