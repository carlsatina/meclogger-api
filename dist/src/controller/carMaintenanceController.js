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
exports.savePreferences = exports.getPreferences = exports.deleteReminder = exports.getReminder = exports.updateReminder = exports.addReminder = exports.listReminders = exports.deleteMaintenanceRecord = exports.getMaintenanceRecord = exports.addMaintenanceRecord = exports.listMaintenanceRecords = exports.listVehicles = exports.deleteVehicle = exports.updateVehicle = exports.getVehicle = exports.updateMaintenanceRecord = exports.addVehicle = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const blobStorage_1 = require("../services/blobStorage");
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
const addVehicle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { make, model, year, color, licensePlate, registrationExpiryDate, vin, vehicleType = 'CAR', purchaseDate, currentMileage, imageUrl, notes } = req.body || {};
    const uploadedImage = req.file;
    if (!make || !model) {
        return res.status(400).json({
            status: 400,
            message: 'make and model are required'
        });
    }
    let resolvedImageUrl = imageUrl || null;
    if (uploadedImage) {
        try {
            const upload = yield (0, blobStorage_1.uploadImageToStorage)(uploadedImage, 'vehicles');
            resolvedImageUrl = upload.url;
        }
        catch (error) {
            const message = (error === null || error === void 0 ? void 0 : error.message) || 'Unable to upload vehicle image';
            return res.status(500).json({ status: 500, message });
        }
    }
    try {
        const vehicle = yield prisma_1.default.vehicle.create({
            data: {
                userId: user.id,
                make,
                model,
                year: year ? Number(year) : null,
                color: color || null,
                licensePlate: licensePlate || null,
                registrationExpiryDate: registrationExpiryDate ? new Date(registrationExpiryDate) : null,
                vin: vin || null,
                vehicleType,
                purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
                currentMileage: currentMileage ? Number(currentMileage) : null,
                imageUrl: resolvedImageUrl,
                notes: notes || null
            }
        });
        return res.status(201).json({
            status: 201,
            vehicle
        });
    }
    catch (error) {
        const message = (error === null || error === void 0 ? void 0 : error.message) || 'Unable to create vehicle';
        return res.status(500).json({
            status: 500,
            message
        });
    }
});
exports.addVehicle = addVehicle;
const updateMaintenanceRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ status: 400, message: 'record id is required' });
    const { vehicleId, maintenanceType, title, description, serviceDate, mileageAtService, servicedBy, location, cost, currency, partsUsed, laborHours, receiptUrl, tags, nextServiceDue, nextServiceMileage } = req.body || {};
    try {
        const existing = yield prisma_1.default.maintenanceRecord.findFirst({
            where: { id, vehicle: { userId: user.id } }
        });
        if (!existing) {
            return res.status(404).json({ status: 404, message: 'Maintenance record not found' });
        }
        const normalizeType = (raw) => {
            if (raw === undefined || raw === null)
                return existing.maintenanceType;
            const str = String(raw).trim();
            return str || existing.maintenanceType;
        };
        const record = yield prisma_1.default.maintenanceRecord.update({
            where: { id },
            data: {
                vehicleId: vehicleId || existing.vehicleId,
                maintenanceType: normalizeType(maintenanceType),
                title: title || normalizeType(maintenanceType),
                description: description !== null && description !== void 0 ? description : existing.description,
                serviceDate: serviceDate ? new Date(serviceDate) : existing.serviceDate,
                mileageAtService: mileageAtService !== undefined ? Number(mileageAtService) : existing.mileageAtService,
                servicedBy: servicedBy !== null && servicedBy !== void 0 ? servicedBy : existing.servicedBy,
                location: location !== null && location !== void 0 ? location : existing.location,
                cost: cost !== undefined ? Number(cost) : existing.cost,
                currency: currency || existing.currency,
                partsUsed: partsUsed !== null && partsUsed !== void 0 ? partsUsed : existing.partsUsed,
                laborHours: laborHours !== undefined ? Number(laborHours) : existing.laborHours,
                receiptUrl: receiptUrl !== null && receiptUrl !== void 0 ? receiptUrl : existing.receiptUrl,
                tags: Array.isArray(tags) ? tags : existing.tags,
                nextServiceDue: nextServiceDue ? new Date(nextServiceDue) : existing.nextServiceDue,
                nextServiceMileage: nextServiceMileage !== undefined ? Number(nextServiceMileage) : existing.nextServiceMileage
            }
        });
        return res.status(200).json({ status: 200, record });
    }
    catch (error) {
        return res.status(500).json({
            status: 500,
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unable to update maintenance record'
        });
    }
});
exports.updateMaintenanceRecord = updateMaintenanceRecord;
const getVehicle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    try {
        const vehicle = yield prisma_1.default.vehicle.findFirst({
            where: {
                id,
                userId: user.id
            }
        });
        if (!vehicle) {
            return res.status(404).json({
                status: 404,
                message: 'Vehicle not found'
            });
        }
        return res.status(200).json({
            status: 200,
            vehicle
        });
    }
    catch (error) {
        return res.status(500).json({
            status: 500,
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unable to fetch vehicle'
        });
    }
});
exports.getVehicle = getVehicle;
const updateVehicle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    const { make, model, year, color, licensePlate, registrationExpiryDate, vin, vehicleType = 'CAR', purchaseDate, currentMileage, imageUrl, notes } = req.body || {};
    const uploadedImage = req.file;
    try {
        const existing = yield prisma_1.default.vehicle.findFirst({
            where: { id, userId: user.id }
        });
        if (!existing) {
            return res.status(404).json({
                status: 404,
                message: 'Vehicle not found'
            });
        }
        let resolvedImageUrl = imageUrl || existing.imageUrl || null;
        if (uploadedImage) {
            const upload = yield (0, blobStorage_1.uploadImageToStorage)(uploadedImage, 'vehicles');
            resolvedImageUrl = upload.url;
        }
        const vehicle = yield prisma_1.default.vehicle.update({
            where: { id },
            data: {
                make: make !== null && make !== void 0 ? make : existing.make,
                model: model !== null && model !== void 0 ? model : existing.model,
                year: year !== undefined ? Number(year) : existing.year,
                color: color !== null && color !== void 0 ? color : existing.color,
                licensePlate: licensePlate !== null && licensePlate !== void 0 ? licensePlate : existing.licensePlate,
                registrationExpiryDate: registrationExpiryDate ? new Date(registrationExpiryDate) : existing.registrationExpiryDate,
                vin: vin !== null && vin !== void 0 ? vin : existing.vin,
                vehicleType: vehicleType || existing.vehicleType,
                purchaseDate: purchaseDate ? new Date(purchaseDate) : existing.purchaseDate,
                currentMileage: currentMileage !== undefined && currentMileage !== null
                    ? Number(currentMileage)
                    : existing.currentMileage,
                imageUrl: resolvedImageUrl,
                notes: notes !== null && notes !== void 0 ? notes : existing.notes
            }
        });
        return res.status(200).json({
            status: 200,
            vehicle
        });
    }
    catch (error) {
        return res.status(500).json({
            status: 500,
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unable to update vehicle'
        });
    }
});
exports.updateVehicle = updateVehicle;
const deleteVehicle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    try {
        const existing = yield prisma_1.default.vehicle.findFirst({
            where: { id, userId: user.id }
        });
        if (!existing) {
            return res.status(404).json({ status: 404, message: 'Vehicle not found' });
        }
        yield prisma_1.default.vehicle.delete({ where: { id } });
        return res.status(200).json({ status: 200, deleted: true });
    }
    catch (error) {
        return res.status(500).json({
            status: 500,
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unable to delete vehicle'
        });
    }
});
exports.deleteVehicle = deleteVehicle;
const listVehicles = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    try {
        const vehicles = yield prisma_1.default.vehicle.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json({
            status: 200,
            vehicles
        });
    }
    catch (error) {
        return res.status(500).json({
            status: 500,
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unable to fetch vehicles'
        });
    }
});
exports.listVehicles = listVehicles;
const listMaintenanceRecords = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const user = ensureUser(req, res);
    if (!user)
        return;
    const vehicleId = req.query.vehicleId;
    const search = (_a = req.query.search) === null || _a === void 0 ? void 0 : _a.trim();
    try {
        const ownedVehicles = yield prisma_1.default.vehicle.findMany({
            where: { userId: user.id },
            select: { id: true }
        });
        const ownedIds = ownedVehicles.map(v => v.id);
        if (vehicleId && !ownedIds.includes(vehicleId)) {
            return res.status(404).json({
                status: 404,
                message: 'Vehicle not found for current user'
            });
        }
        const filterIds = vehicleId ? [vehicleId] : ownedIds;
        const records = yield prisma_1.default.maintenanceRecord.findMany({
            where: Object.assign({ vehicleId: { in: filterIds } }, (search
                ? {
                    OR: [
                        { maintenanceType: { contains: search, mode: 'insensitive' } },
                        { title: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } }
                    ]
                }
                : {})),
            orderBy: { serviceDate: 'desc' }
        });
        return res.status(200).json({
            status: 200,
            records
        });
    }
    catch (error) {
        console.error('listMaintenanceRecords error', error);
        return res.status(500).json({
            status: 500,
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unable to fetch maintenance records'
        });
    }
});
exports.listMaintenanceRecords = listMaintenanceRecords;
const addMaintenanceRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { vehicleId, maintenanceType = 'OTHER', title, description, serviceDate, mileageAtService, servicedBy, location, cost, currency = 'USD', partsUsed, laborHours, receiptUrl, tags } = req.body || {};
    const normalizedTitle = title || maintenanceType || 'Maintenance';
    if (!vehicleId || !normalizedTitle || !serviceDate) {
        return res.status(400).json({
            status: 400,
            message: 'vehicleId, maintenanceType/title, and serviceDate are required'
        });
    }
    const vehicle = yield prisma_1.default.vehicle.findFirst({
        where: {
            id: vehicleId,
            userId: user.id
        }
    });
    if (!vehicle) {
        return res.status(404).json({
            status: 404,
            message: 'Vehicle not found for current user'
        });
    }
    const normalizeType = (raw) => {
        if (!raw)
            return 'OTHER';
        const str = String(raw).trim();
        return str || 'OTHER';
    };
    try {
        const record = yield prisma_1.default.maintenanceRecord.create({
            data: {
                vehicleId,
                maintenanceType: normalizeType(maintenanceType),
                title: normalizedTitle,
                description: description || null,
                serviceDate: new Date(serviceDate),
                mileageAtService: mileageAtService ? Number(mileageAtService) : null,
                servicedBy: servicedBy || null,
                location: location || null,
                cost: cost !== undefined && cost !== null ? Number(cost) : null,
                currency: currency || 'USD',
                partsUsed: partsUsed || null,
                laborHours: laborHours ? Number(laborHours) : null,
                receiptUrl: receiptUrl || null,
                tags: Array.isArray(tags) ? tags : []
            }
        });
        return res.status(201).json({
            status: 201,
            record
        });
    }
    catch (error) {
        const message = (error === null || error === void 0 ? void 0 : error.message) || 'Unable to create maintenance record';
        return res.status(500).json({
            status: 500,
            message
        });
    }
});
exports.addMaintenanceRecord = addMaintenanceRecord;
const getMaintenanceRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    try {
        const record = yield prisma_1.default.maintenanceRecord.findFirst({
            where: {
                id,
                vehicle: {
                    userId: user.id
                }
            },
            include: {
                vehicle: true
            }
        });
        if (!record) {
            return res.status(404).json({
                status: 404,
                message: 'Maintenance record not found'
            });
        }
        return res.status(200).json({
            status: 200,
            record
        });
    }
    catch (error) {
        return res.status(500).json({
            status: 500,
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unable to fetch maintenance record'
        });
    }
});
exports.getMaintenanceRecord = getMaintenanceRecord;
const deleteMaintenanceRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    try {
        const record = yield prisma_1.default.maintenanceRecord.findFirst({
            where: {
                id,
                vehicle: {
                    userId: user.id
                }
            }
        });
        if (!record) {
            return res.status(404).json({
                status: 404,
                message: 'Maintenance record not found'
            });
        }
        yield prisma_1.default.maintenanceRecord.delete({
            where: { id }
        });
        return res.status(200).json({
            status: 200,
            message: 'Maintenance record deleted'
        });
    }
    catch (error) {
        return res.status(500).json({
            status: 500,
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unable to delete maintenance record'
        });
    }
});
exports.deleteMaintenanceRecord = deleteMaintenanceRecord;
const listReminders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const vehicleId = req.query.vehicleId;
    try {
        const ownedVehicles = yield prisma_1.default.vehicle.findMany({
            where: { userId: user.id },
            select: { id: true }
        });
        const ownedIds = ownedVehicles.map(v => v.id);
        if (!ownedIds.length) {
            return res.status(200).json({ status: 200, reminders: [] });
        }
        const reminders = yield prisma_1.default.vehicleReminder.findMany({
            where: {
                vehicleId: vehicleId ? vehicleId : { in: ownedIds },
                vehicle: { userId: user.id }
            },
            orderBy: [
                { dueDate: 'asc' },
                { createdAt: 'desc' }
            ]
        });
        return res.status(200).json({
            status: 200,
            reminders
        });
    }
    catch (error) {
        return res.status(500).json({
            status: 500,
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unable to fetch reminders'
        });
    }
});
exports.listReminders = listReminders;
const addReminder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { vehicleId, maintenanceType, title, description, dueDate, dueMileage, notifyInAdvance } = req.body || {};
    if (!vehicleId) {
        return res.status(400).json({ status: 400, message: 'vehicleId is required' });
    }
    if (!maintenanceType && !title) {
        return res.status(400).json({ status: 400, message: 'maintenanceType is required' });
    }
    try {
        const vehicle = yield prisma_1.default.vehicle.findFirst({
            where: { id: vehicleId, userId: user.id }
        });
        if (!vehicle) {
            return res.status(404).json({ status: 404, message: 'Vehicle not found' });
        }
        const reminder = yield prisma_1.default.vehicleReminder.create({
            data: {
                vehicleId,
                maintenanceType: maintenanceType || title,
                title: title || maintenanceType,
                description: description || null,
                dueDate: dueDate ? new Date(dueDate) : null,
                dueMileage: dueMileage ? Number(dueMileage) : null,
                notifyInAdvance: notifyInAdvance ? Number(notifyInAdvance) : null
            }
        });
        return res.status(201).json({
            status: 201,
            reminder
        });
    }
    catch (error) {
        return res.status(500).json({
            status: 500,
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unable to create reminder'
        });
    }
});
exports.addReminder = addReminder;
const updateReminder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    const { maintenanceType, title, description, dueDate, dueMileage, notifyInAdvance, completed, active } = req.body || {};
    try {
        const existing = yield prisma_1.default.vehicleReminder.findFirst({
            where: {
                id,
                vehicle: { userId: user.id }
            }
        });
        if (!existing) {
            return res.status(404).json({ status: 404, message: 'Reminder not found' });
        }
        const updateData = {};
        if (maintenanceType !== undefined)
            updateData.maintenanceType = maintenanceType;
        if (title !== undefined)
            updateData.title = title;
        if (description !== undefined)
            updateData.description = description;
        if (dueDate !== undefined)
            updateData.dueDate = dueDate ? new Date(dueDate) : null;
        if (dueMileage !== undefined)
            updateData.dueMileage = dueMileage ? Number(dueMileage) : null;
        if (notifyInAdvance !== undefined)
            updateData.notifyInAdvance = notifyInAdvance ? Number(notifyInAdvance) : null;
        if (active !== undefined)
            updateData.active = Boolean(active);
        if (completed !== undefined) {
            const completedVal = completed === true || completed === 'true' || completed === 1 || completed === '1';
            updateData.completed = completedVal;
            updateData.completedAt = completedVal ? new Date() : null;
        }
        const reminder = yield prisma_1.default.vehicleReminder.update({
            where: { id },
            data: updateData
        });
        return res.status(200).json({
            status: 200,
            reminder
        });
    }
    catch (error) {
        return res.status(500).json({
            status: 500,
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unable to update reminder'
        });
    }
});
exports.updateReminder = updateReminder;
const getReminder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    try {
        const reminder = yield prisma_1.default.vehicleReminder.findFirst({
            where: { id, vehicle: { userId: user.id } },
            include: { vehicle: true }
        });
        if (!reminder) {
            return res.status(404).json({ status: 404, message: 'Reminder not found' });
        }
        return res.status(200).json({ status: 200, reminder });
    }
    catch (error) {
        return res.status(500).json({
            status: 500,
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unable to fetch reminder'
        });
    }
});
exports.getReminder = getReminder;
const deleteReminder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    try {
        const existing = yield prisma_1.default.vehicleReminder.findFirst({
            where: { id, vehicle: { userId: user.id } }
        });
        if (!existing) {
            return res.status(404).json({ status: 404, message: 'Reminder not found' });
        }
        yield prisma_1.default.vehicleReminder.delete({ where: { id } });
        return res.status(200).json({ status: 200, deleted: true });
    }
    catch (error) {
        return res.status(500).json({
            status: 500,
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unable to delete reminder'
        });
    }
});
exports.deleteReminder = deleteReminder;
const getPreferences = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    try {
        const prefs = yield prisma_1.default.userPreference.findUnique({
            where: { userId: user.id }
        });
        return res.status(200).json({
            status: 200,
            preferences: prefs || {
                distanceUnit: 'km',
                currency: 'USD',
                maintenanceTypes: []
            }
        });
    }
    catch (error) {
        return res.status(500).json({
            status: 500,
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unable to load preferences'
        });
    }
});
exports.getPreferences = getPreferences;
const savePreferences = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { distanceUnit = 'km', currency = 'USD', maintenanceTypes = [] } = req.body || {};
    try {
        const prefs = yield prisma_1.default.userPreference.upsert({
            where: { userId: user.id },
            update: {
                distanceUnit,
                currency,
                maintenanceTypes
            },
            create: {
                userId: user.id,
                distanceUnit,
                currency,
                maintenanceTypes
            }
        });
        return res.status(200).json({
            status: 200,
            preferences: prefs
        });
    }
    catch (error) {
        return res.status(500).json({
            status: 500,
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unable to save preferences'
        });
    }
});
exports.savePreferences = savePreferences;
