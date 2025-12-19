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
exports.deleteIllnessRecord = exports.updateIllnessRecord = exports.getIllnessRecord = exports.getIllnessRecords = exports.createIllnessRecord = exports.updateBodyWeightRecord = exports.updateBloodSugarRecord = exports.updateBloodPressureRecord = exports.getBodyWeightRecord = exports.getBloodSugarRecord = exports.getBloodPressureRecord = exports.getBloodSugarRecords = exports.getBloodPressureRecords = exports.getBodyWeightRecords = exports.createBodyWeightRecord = exports.createBloodSugarRecord = exports.createBloodPressureRecord = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const resolveProfileForUser = (userId, profileId) => __awaiter(void 0, void 0, void 0, function* () {
    if (profileId) {
        return prisma_1.default.profile.findFirst({
            where: {
                id: profileId,
                userId
            }
        });
    }
    return prisma_1.default.profile.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' }
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
const findEntryForUser = (userId, entryId) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma_1.default.vitalEntry.findFirst({
        where: {
            id: entryId,
            profile: {
                userId
            }
        }
    });
});
const findIllnessForUser = (userId, entryId) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma_1.default.illnessEntry.findFirst({
        where: {
            id: entryId,
            profile: {
                userId
            }
        }
    });
});
const asIllnessSeverity = (value) => {
    if (typeof value !== 'string')
        return null;
    const key = value.toUpperCase();
    return client_1.IllnessSeverity[key] || null;
};
const asIllnessStatus = (value) => {
    if (typeof value !== 'string')
        return null;
    const key = value.toUpperCase();
    return client_1.IllnessStatus[key] || null;
};
const createBloodPressureRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { profileId, systolic, diastolic, recordedAt, notes } = req.body;
    const systolicValue = Number(systolic);
    const diastolicValue = Number(diastolic);
    if (Number.isNaN(systolicValue) || Number.isNaN(diastolicValue)) {
        return res.status(400).json({
            status: 400,
            message: 'Systolic and diastolic values are required and must be numbers.'
        });
    }
    const profile = yield resolveProfileForUser(user.id, profileId);
    if (!profile) {
        return res.status(404).json({
            status: 404,
            message: 'Profile not found for current user.'
        });
    }
    const entry = yield prisma_1.default.vitalEntry.create({
        data: {
            profileId: profile.id,
            vitalType: client_1.VitalType.BLOOD_PRESSURE_SYSTOLIC,
            systolic: systolicValue,
            diastolic: diastolicValue,
            unit: 'mmHg',
            recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
            notes
        }
    });
    return res.status(201).json({
        status: 201,
        record: entry
    });
});
exports.createBloodPressureRecord = createBloodPressureRecord;
const createBloodSugarRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { profileId, reading, context, recordedAt, notes } = req.body;
    const readingValue = Number(reading);
    if (Number.isNaN(readingValue)) {
        return res.status(400).json({
            status: 400,
            message: 'Blood sugar reading must be provided as a number.'
        });
    }
    const profile = yield resolveProfileForUser(user.id, profileId);
    if (!profile) {
        return res.status(404).json({
            status: 404,
            message: 'Profile not found for current user.'
        });
    }
    const entry = yield prisma_1.default.vitalEntry.create({
        data: {
            profileId: profile.id,
            vitalType: client_1.VitalType.BLOOD_GLUCOSE,
            valueNumber: readingValue,
            unit: 'mg/dL',
            chartGroup: context,
            recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
            notes
        }
    });
    return res.status(201).json({
        status: 201,
        record: entry
    });
});
exports.createBloodSugarRecord = createBloodSugarRecord;
const getBloodPressureRecords = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
    const records = yield prisma_1.default.vitalEntry.findMany({
        where: {
            profileId: profile.id,
            vitalType: client_1.VitalType.BLOOD_PRESSURE_SYSTOLIC
        },
        orderBy: {
            recordedAt: 'asc'
        }
    });
    return res.status(200).json({
        status: 200,
        records
    });
});
exports.getBloodPressureRecords = getBloodPressureRecords;
const getBloodSugarRecords = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
    const records = yield prisma_1.default.vitalEntry.findMany({
        where: {
            profileId: profile.id,
            vitalType: client_1.VitalType.BLOOD_GLUCOSE
        },
        orderBy: {
            recordedAt: 'asc'
        }
    });
    return res.status(200).json({
        status: 200,
        records
    });
});
exports.getBloodSugarRecords = getBloodSugarRecords;
const createBodyWeightRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { profileId, weight, recordedAt, notes } = req.body;
    const weightValue = Number(weight);
    if (Number.isNaN(weightValue)) {
        return res.status(400).json({
            status: 400,
            message: 'Weight must be provided as a number.'
        });
    }
    const profile = yield resolveProfileForUser(user.id, profileId);
    if (!profile) {
        return res.status(404).json({
            status: 404,
            message: 'Profile not found for current user.'
        });
    }
    const entry = yield prisma_1.default.vitalEntry.create({
        data: {
            profileId: profile.id,
            vitalType: client_1.VitalType.WEIGHT,
            valueNumber: weightValue,
            unit: 'kg',
            recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
            notes
        }
    });
    return res.status(201).json({
        status: 201,
        record: entry
    });
});
exports.createBodyWeightRecord = createBodyWeightRecord;
const getBodyWeightRecords = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
    const records = yield prisma_1.default.vitalEntry.findMany({
        where: {
            profileId: profile.id,
            vitalType: client_1.VitalType.WEIGHT
        },
        orderBy: {
            recordedAt: 'asc'
        }
    });
    return res.status(200).json({
        status: 200,
        records
    });
});
exports.getBodyWeightRecords = getBodyWeightRecords;
const getBloodPressureRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const entryId = req.params.id;
    const entry = yield findEntryForUser(user.id, entryId);
    if (!entry || entry.vitalType !== client_1.VitalType.BLOOD_PRESSURE_SYSTOLIC) {
        return res.status(404).json({
            status: 404,
            message: 'Blood pressure record not found.'
        });
    }
    res.status(200).json({
        status: 200,
        record: entry
    });
});
exports.getBloodPressureRecord = getBloodPressureRecord;
const getBloodSugarRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const entryId = req.params.id;
    const entry = yield findEntryForUser(user.id, entryId);
    if (!entry || entry.vitalType !== client_1.VitalType.BLOOD_GLUCOSE) {
        return res.status(404).json({
            status: 404,
            message: 'Blood sugar record not found.'
        });
    }
    res.status(200).json({
        status: 200,
        record: entry
    });
});
exports.getBloodSugarRecord = getBloodSugarRecord;
const getBodyWeightRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const entryId = req.params.id;
    const entry = yield findEntryForUser(user.id, entryId);
    if (!entry || entry.vitalType !== client_1.VitalType.WEIGHT) {
        return res.status(404).json({
            status: 404,
            message: 'Body weight record not found.'
        });
    }
    res.status(200).json({
        status: 200,
        record: entry
    });
});
exports.getBodyWeightRecord = getBodyWeightRecord;
const updateBloodPressureRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const entryId = req.params.id;
    const existing = yield findEntryForUser(user.id, entryId);
    if (!existing || existing.vitalType !== client_1.VitalType.BLOOD_PRESSURE_SYSTOLIC) {
        return res.status(404).json({
            status: 404,
            message: 'Blood pressure record not found.'
        });
    }
    const { systolic, diastolic, recordedAt, notes } = req.body;
    const updateData = {};
    if (typeof systolic !== 'undefined') {
        const value = Number(systolic);
        if (Number.isNaN(value)) {
            return res.status(400).json({ status: 400, message: 'Systolic must be a number.' });
        }
        updateData.systolic = value;
    }
    if (typeof diastolic !== 'undefined') {
        const value = Number(diastolic);
        if (Number.isNaN(value)) {
            return res.status(400).json({ status: 400, message: 'Diastolic must be a number.' });
        }
        updateData.diastolic = value;
    }
    if (typeof notes !== 'undefined') {
        updateData.notes = notes;
    }
    if (recordedAt) {
        updateData.recordedAt = new Date(recordedAt);
    }
    const updated = yield prisma_1.default.vitalEntry.update({
        where: { id: entryId },
        data: updateData
    });
    return res.status(200).json({
        status: 200,
        record: updated
    });
});
exports.updateBloodPressureRecord = updateBloodPressureRecord;
const updateBloodSugarRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const entryId = req.params.id;
    const existing = yield findEntryForUser(user.id, entryId);
    if (!existing || existing.vitalType !== client_1.VitalType.BLOOD_GLUCOSE) {
        return res.status(404).json({
            status: 404,
            message: 'Blood sugar record not found.'
        });
    }
    const { reading, context, recordedAt, notes } = req.body;
    const updateData = {};
    if (typeof reading !== 'undefined') {
        const value = Number(reading);
        if (Number.isNaN(value)) {
            return res.status(400).json({ status: 400, message: 'Reading must be a number.' });
        }
        updateData.valueNumber = value;
    }
    if (typeof context !== 'undefined') {
        updateData.chartGroup = context;
    }
    if (typeof notes !== 'undefined') {
        updateData.notes = notes;
    }
    if (recordedAt) {
        updateData.recordedAt = new Date(recordedAt);
    }
    const updated = yield prisma_1.default.vitalEntry.update({
        where: { id: entryId },
        data: updateData
    });
    return res.status(200).json({
        status: 200,
        record: updated
    });
});
exports.updateBloodSugarRecord = updateBloodSugarRecord;
const updateBodyWeightRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const entryId = req.params.id;
    const existing = yield findEntryForUser(user.id, entryId);
    if (!existing || existing.vitalType !== client_1.VitalType.WEIGHT) {
        return res.status(404).json({
            status: 404,
            message: 'Body weight record not found.'
        });
    }
    const { weight, recordedAt, notes } = req.body;
    const updateData = {};
    if (typeof weight !== 'undefined') {
        const value = Number(weight);
        if (Number.isNaN(value)) {
            return res.status(400).json({ status: 400, message: 'Weight must be a number.' });
        }
        updateData.valueNumber = value;
    }
    if (typeof notes !== 'undefined') {
        updateData.notes = notes;
    }
    if (recordedAt) {
        updateData.recordedAt = new Date(recordedAt);
    }
    const updated = yield prisma_1.default.vitalEntry.update({
        where: { id: entryId },
        data: updateData
    });
    return res.status(200).json({
        status: 200,
        record: updated
    });
});
exports.updateBodyWeightRecord = updateBodyWeightRecord;
const createIllnessRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { profileId, diagnosis, symptoms, bodyTemperature, temperatureUnit, severity, status, notes, medications, recordedAt } = req.body;
    if (!diagnosis) {
        return res.status(400).json({
            status: 400,
            message: 'Diagnosis is required.'
        });
    }
    const profile = yield resolveProfileForUser(user.id, profileId);
    if (!profile) {
        return res.status(404).json({
            status: 404,
            message: 'Profile not found for current user.'
        });
    }
    const symptomsArray = Array.isArray(symptoms) ? symptoms.filter(Boolean) : [];
    const medicationsArray = Array.isArray(medications) ? medications.filter(Boolean) : [];
    const tempValue = typeof bodyTemperature !== 'undefined' && bodyTemperature !== null
        ? Number(bodyTemperature)
        : null;
    if (tempValue !== null && Number.isNaN(tempValue)) {
        return res.status(400).json({
            status: 400,
            message: 'Body temperature must be a number.'
        });
    }
    const parsedSeverity = asIllnessSeverity(severity);
    const parsedStatus = asIllnessStatus(status);
    const entry = yield prisma_1.default.illnessEntry.create({
        data: {
            profileId: profile.id,
            diagnosis,
            symptoms: symptomsArray,
            bodyTemperature: tempValue,
            temperatureUnit: temperatureUnit || 'C',
            severity: parsedSeverity || client_1.IllnessSeverity.MILD,
            status: parsedStatus || client_1.IllnessStatus.ONGOING,
            notes,
            medications: medicationsArray,
            recordedAt: recordedAt ? new Date(recordedAt) : new Date()
        }
    });
    return res.status(201).json({
        status: 201,
        record: entry
    });
});
exports.createIllnessRecord = createIllnessRecord;
const getIllnessRecords = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
    const records = yield prisma_1.default.illnessEntry.findMany({
        where: {
            profileId: profile.id
        },
        orderBy: {
            recordedAt: 'desc'
        }
    });
    return res.status(200).json({
        status: 200,
        records
    });
});
exports.getIllnessRecords = getIllnessRecords;
const getIllnessRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const entryId = req.params.id;
    const entry = yield findIllnessForUser(user.id, entryId);
    if (!entry) {
        return res.status(404).json({
            status: 404,
            message: 'Illness record not found.'
        });
    }
    return res.status(200).json({
        status: 200,
        record: entry
    });
});
exports.getIllnessRecord = getIllnessRecord;
const updateIllnessRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const entryId = req.params.id;
    const existing = yield findIllnessForUser(user.id, entryId);
    if (!existing) {
        return res.status(404).json({
            status: 404,
            message: 'Illness record not found.'
        });
    }
    const { diagnosis, symptoms, bodyTemperature, temperatureUnit, severity, status, notes, medications, recordedAt } = req.body;
    const updateData = {};
    if (typeof diagnosis !== 'undefined') {
        updateData.diagnosis = diagnosis;
    }
    if (typeof symptoms !== 'undefined') {
        updateData.symptoms = Array.isArray(symptoms) ? symptoms.filter(Boolean) : [];
    }
    if (typeof medications !== 'undefined') {
        updateData.medications = Array.isArray(medications) ? medications.filter(Boolean) : [];
    }
    if (typeof bodyTemperature !== 'undefined') {
        if (bodyTemperature === null || bodyTemperature === '') {
            updateData.bodyTemperature = null;
        }
        else {
            const value = Number(bodyTemperature);
            if (Number.isNaN(value)) {
                return res.status(400).json({ status: 400, message: 'Body temperature must be a number.' });
            }
            updateData.bodyTemperature = value;
        }
    }
    if (typeof temperatureUnit !== 'undefined') {
        updateData.temperatureUnit = temperatureUnit;
    }
    if (typeof severity !== 'undefined') {
        const parsed = asIllnessSeverity(severity);
        if (parsed) {
            updateData.severity = parsed;
        }
        else {
            return res.status(400).json({ status: 400, message: 'Invalid severity value.' });
        }
    }
    if (typeof status !== 'undefined') {
        const parsed = asIllnessStatus(status);
        if (parsed) {
            updateData.status = parsed;
        }
        else {
            return res.status(400).json({ status: 400, message: 'Invalid status value.' });
        }
    }
    if (typeof notes !== 'undefined') {
        updateData.notes = notes;
    }
    if (recordedAt) {
        updateData.recordedAt = new Date(recordedAt);
    }
    const updated = yield prisma_1.default.illnessEntry.update({
        where: { id: entryId },
        data: updateData
    });
    return res.status(200).json({
        status: 200,
        record: updated
    });
});
exports.updateIllnessRecord = updateIllnessRecord;
const deleteIllnessRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const entryId = req.params.id;
    const existing = yield findIllnessForUser(user.id, entryId);
    if (!existing) {
        return res.status(404).json({
            status: 404,
            message: 'Illness record not found.'
        });
    }
    yield prisma_1.default.illnessEntry.delete({
        where: { id: entryId }
    });
    return res.status(204).json({
        status: 204,
        message: 'Illness record deleted.'
    });
});
exports.deleteIllnessRecord = deleteIllnessRecord;
