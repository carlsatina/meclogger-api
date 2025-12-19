"use strict";
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
exports.deleteMedicalRecord = exports.updateMedicalRecord = exports.createMedicalRecord = exports.getMedicalRecord = exports.listMedicalRecords = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const client_1 = require("@prisma/client");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const blobStorage_1 = require("../services/blobStorage");
const limits_1 = require("../config/limits");
const RECORDS_PUBLIC_PATH = '/records';
const RECORDS_UPLOAD_PATH = path_1.default.resolve(process.cwd(), 'uploaded-images', 'records');
const attachmentsWithinLimit = (files, res) => {
    if (!files.length)
        return true;
    const totalBytes = files.reduce((sum, file) => sum + ((file === null || file === void 0 ? void 0 : file.size) || 0), 0);
    if (totalBytes > limits_1.MEDICAL_RECORD_MAX_TOTAL_BYTES) {
        res.status(413).json({
            status: 413,
            message: `Attachments too large. Maximum combined size is ${limits_1.MEDICAL_RECORD_MAX_TOTAL_MB}MB (limit ${limits_1.MEDICAL_RECORD_MAX_FILE_MB}MB per file).`
        });
        return false;
    }
    return true;
};
const isRemoteUrl = (url) => /^https?:\/\//i.test(url);
const normalizeRecordType = (type) => {
    if (!type || typeof type !== 'string')
        return client_1.RecordType.OTHER;
    const normalized = type.toUpperCase().replace(/[\s-]+/g, '_');
    const validTypes = Object.values(client_1.RecordType);
    if (validTypes.includes(normalized)) {
        return normalized;
    }
    return client_1.RecordType.OTHER;
};
const resolveDiskPathForFile = (fileUrl) => {
    if (isRemoteUrl(fileUrl))
        return null;
    const normalized = fileUrl.replace(/^\/+/, ''); // strip leading slash
    return path_1.default.join(RECORDS_UPLOAD_PATH, normalized.replace(/^records\/?/, ''));
};
const resolveProfileForUser = (userId, profileId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!profileId)
        return null;
    return prisma_1.default.profile.findFirst({
        where: {
            id: profileId,
            userId
        }
    });
});
const ensureUser = (req, res) => {
    if (!req.user) {
        res.status(401).json({
            status: 401,
            message: 'Unauthorized'
        });
        return null;
    }
    return req.user;
};
const parseTagsInput = (value) => {
    if (typeof value === 'undefined')
        return null;
    if (Array.isArray(value)) {
        return value.map(tag => String(tag).trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed.length)
            return [];
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed.map(tag => String(tag).trim()).filter(Boolean);
            }
        }
        catch (_a) {
            // ignore JSON parse failure, fall through to comma split
        }
        return trimmed.split(',').map(tag => tag.trim()).filter(Boolean);
    }
    return [];
};
const parseIdsInput = (value) => {
    if (typeof value === 'undefined' || value === null)
        return [];
    if (Array.isArray(value)) {
        return value.map(id => String(id)).filter(Boolean);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed.length)
            return [];
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed.map(id => String(id)).filter(Boolean);
            }
        }
        catch (_a) {
            // ignore and treat as comma separated
        }
        return trimmed.split(',').map(id => id.trim()).filter(Boolean);
    }
    return [];
};
const listMedicalRecords = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const profileId = req.query.profileId;
    if (!profileId) {
        return res.status(400).json({
            status: 400,
            message: 'profileId query parameter is required.'
        });
    }
    const profile = yield resolveProfileForUser(user.id, profileId);
    if (!profile) {
        return res.status(404).json({
            status: 404,
            message: 'Profile not found for current user.'
        });
    }
    const records = yield prisma_1.default.medicalRecord.findMany({
        where: { profileId: profile.id },
        orderBy: { recordDate: 'desc' },
        include: {
            files: true
        }
    });
    res.status(200).json({
        status: 200,
        records
    });
});
exports.listMedicalRecords = listMedicalRecords;
const getMedicalRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const recordId = req.params.id;
    if (!recordId) {
        return res.status(400).json({
            status: 400,
            message: 'Record ID is required.'
        });
    }
    const record = yield prisma_1.default.medicalRecord.findFirst({
        where: {
            id: recordId,
            profile: {
                userId: user.id
            }
        },
        include: {
            files: true,
            profile: true
        }
    });
    if (!record) {
        return res.status(404).json({
            status: 404,
            message: 'Record not found.'
        });
    }
    res.status(200).json({
        status: 200,
        record
    });
});
exports.getMedicalRecord = getMedicalRecord;
const createMedicalRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { profileId, title, recordType = client_1.RecordType.OTHER, recordDate, providerName, notes, tags } = req.body;
    if (!profileId || !title || !recordDate) {
        return res.status(400).json({
            status: 400,
            message: 'profileId, title and recordDate are required.'
        });
    }
    const profile = yield resolveProfileForUser(user.id, profileId);
    if (!profile) {
        return res.status(404).json({
            status: 404,
            message: 'Profile not found for current user.'
        });
    }
    const files = req.files || [];
    if (!attachmentsWithinLimit(files, res)) {
        return;
    }
    const record = yield prisma_1.default.medicalRecord.create({
        data: {
            profileId: profile.id,
            title,
            recordType: normalizeRecordType(recordType),
            recordDate: new Date(recordDate),
            providerName,
            notes,
            tags: (_a = parseTagsInput(tags)) !== null && _a !== void 0 ? _a : []
        },
        include: {
            files: true
        }
    });
    if (files.length) {
        try {
            const uploads = yield Promise.all(files.map(file => (0, blobStorage_1.uploadImageToStorage)(file, 'records')));
            const fileData = files.map((file, idx) => ({
                url: uploads[idx].url,
                mimeType: file.mimetype,
                sizeBytes: file.size,
                originalName: file.originalname,
                recordId: record.id
            }));
            yield prisma_1.default.fileAsset.createMany({
                data: fileData
            });
        }
        catch (error) {
            const message = (error === null || error === void 0 ? void 0 : error.message) || 'Unable to upload files';
            return res.status(500).json({ status: 500, message });
        }
    }
    const recordWithFiles = yield prisma_1.default.medicalRecord.findUnique({
        where: { id: record.id },
        include: { files: true }
    });
    res.status(201).json({
        status: 201,
        record: recordWithFiles
    });
});
exports.createMedicalRecord = createMedicalRecord;
const updateMedicalRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const recordId = req.params.id;
    const existing = yield prisma_1.default.medicalRecord.findFirst({
        where: {
            id: recordId,
            profile: {
                userId: user.id
            }
        }
    });
    if (!existing) {
        return res.status(404).json({
            status: 404,
            message: 'Record not found.'
        });
    }
    const { title, recordType, recordDate, providerName, notes, tags, filesToRemove } = req.body;
    const files = req.files || [];
    if (!attachmentsWithinLimit(files, res)) {
        return;
    }
    const parsedTags = parseTagsInput(tags);
    const filesMarkedForRemoval = parseIdsInput(filesToRemove);
    const updated = yield prisma_1.default.medicalRecord.update({
        where: { id: recordId },
        data: Object.assign({ title, recordType: recordType ? normalizeRecordType(recordType) : existing.recordType, recordDate: recordDate ? new Date(recordDate) : existing.recordDate, providerName,
            notes }, (parsedTags !== null ? { tags: parsedTags } : {})),
        include: { files: true }
    });
    if (filesMarkedForRemoval.length) {
        const removableFiles = yield prisma_1.default.fileAsset.findMany({
            where: {
                id: { in: filesMarkedForRemoval },
                recordId
            }
        });
        if (removableFiles.length) {
            yield prisma_1.default.fileAsset.deleteMany({
                where: {
                    id: { in: removableFiles.map(file => file.id) },
                    recordId
                }
            });
            removableFiles.forEach(file => {
                const filePath = resolveDiskPathForFile(file.url);
                if (filePath) {
                    fs_1.default.unlink(filePath, () => {
                        // ignore errors
                    });
                }
            });
        }
    }
    if (files.length) {
        try {
            const uploads = yield Promise.all(files.map(file => (0, blobStorage_1.uploadImageToStorage)(file, 'records')));
            const fileData = files.map((file, idx) => ({
                url: uploads[idx].url,
                mimeType: file.mimetype,
                sizeBytes: file.size,
                originalName: file.originalname,
                recordId: recordId
            }));
            yield prisma_1.default.fileAsset.createMany({
                data: fileData
            });
        }
        catch (error) {
            const message = (error === null || error === void 0 ? void 0 : error.message) || 'Unable to upload files';
            return res.status(500).json({ status: 500, message });
        }
    }
    const updatedWithFiles = yield prisma_1.default.medicalRecord.findUnique({
        where: { id: recordId },
        include: { files: true }
    });
    res.status(200).json({
        status: 200,
        record: updatedWithFiles
    });
});
exports.updateMedicalRecord = updateMedicalRecord;
const deleteMedicalRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const recordId = req.params.id;
    const existing = yield prisma_1.default.medicalRecord.findFirst({
        where: {
            id: recordId,
            profile: {
                userId: user.id
            }
        }
    });
    if (!existing) {
        return res.status(404).json({
            status: 404,
            message: 'Record not found.'
        });
    }
    const files = yield prisma_1.default.fileAsset.findMany({
        where: { recordId }
    });
    yield prisma_1.default.fileAsset.deleteMany({
        where: { recordId }
    });
    yield prisma_1.default.medicalRecord.delete({
        where: { id: recordId }
    });
    files.forEach(file => {
        const filePath = resolveDiskPathForFile(file.url);
        if (filePath) {
            fs_1.default.unlink(filePath, () => {
                // ignore errors
            });
        }
    });
    res.status(200).json({
        status: 200,
        message: 'Record deleted successfully.'
    });
});
exports.deleteMedicalRecord = deleteMedicalRecord;
