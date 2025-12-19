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
exports.setMedicineReminderStatus = exports.deleteMedicineReminder = exports.updateMedicineReminder = exports.createMedicineReminder = exports.getMedicineReminder = exports.listMedicineReminders = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const normalizeUserId = (value) => {
    if (typeof value === 'string')
        return value;
    if (typeof value === 'number' && !Number.isNaN(value))
        return String(value);
    return null;
};
const ensureUser = (req, res) => {
    if (!req.user) {
        res.status(401).json({
            status: 401,
            message: 'Unauthorized'
        });
        return null;
    }
    const userId = normalizeUserId(req.user.id);
    if (!userId) {
        res.status(400).json({
            status: 400,
            message: 'Invalid user identifier.'
        });
        return null;
    }
    return Object.assign(Object.assign({}, req.user), { id: userId });
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
const ensureReminderForUser = (userId, reminderId) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma_1.default.medicineReminder.findFirst({
        where: {
            id: reminderId,
            profile: {
                userId
            }
        },
        include: {
            medication: true
        }
    });
});
const startOfDay = (date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
};
const endOfDay = (date) => {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
};
const isSameDay = (a, b) => {
    return startOfDay(a).getTime() === startOfDay(b).getTime();
};
const padTimeUnit = (value) => value.toString().padStart(2, '0');
const normalizeTimeValue = (value) => {
    var _a;
    if (typeof value !== 'string')
        return null;
    const match = value.trim().match(/^(\d{1,2})(?::(\d{1,2}))?$/);
    if (!match)
        return null;
    const hours = Math.min(23, Math.max(0, Number(match[1])));
    const minutes = Math.min(59, Math.max(0, Number((_a = match[2]) !== null && _a !== void 0 ? _a : '0')));
    return `${padTimeUnit(hours)}:${padTimeUnit(minutes)}`;
};
const combineDateAndTime = (date, time) => {
    const result = new Date(date);
    if (time) {
        const [hours, minutes] = time.split(':').map(Number);
        result.setHours(hours || 0, minutes || 0, 0, 0);
    }
    else {
        result.setHours(8, 0, 0, 0);
    }
    return result;
};
const parseReferenceDate = (value) => {
    if (!value)
        return null;
    const raw = Array.isArray(value) ? value[0] : value;
    if (!raw)
        return null;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime()))
        return null;
    return parsed;
};
const getLogForDate = (medicationId, reference) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma_1.default.medicationLog.findFirst({
        where: {
            medicationId,
            occurredAt: {
                gte: startOfDay(reference),
                lte: endOfDay(reference)
            }
        }
    });
});
const getLogForExactDateTime = (medicationId, dateTime) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma_1.default.medicationLog.findFirst({
        where: {
            medicationId,
            occurredAt: dateTime
        }
    });
});
const formatTimeFromDate = (date) => {
    return `${padTimeUnit(date.getHours())}:${padTimeUnit(date.getMinutes())}`;
};
const getScheduledTimesForReminder = (reminder) => {
    const normalized = Array.isArray(reminder.times)
        ? reminder.times.map((value) => normalizeTimeValue(value)).filter(Boolean)
        : [];
    if (normalized.length)
        return normalized;
    const single = normalizeTimeValue(reminder.time);
    return single ? [single] : [];
};
const listMedicineReminders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
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
    const today = new Date();
    const showAllReminders = req.query.all === 'true';
    const referenceDate = showAllReminders
        ? null
        : parseReferenceDate(req.query.date) || today;
    const reminders = yield prisma_1.default.medicineReminder.findMany({
        where: {
            profileId: profile.id
        },
        orderBy: {
            createdAt: 'desc'
        },
        include: {
            medication: {
                include: showAllReminders
                    ? {
                        logs: true
                    }
                    : {
                        logs: {
                            where: {
                                occurredAt: {
                                    gte: startOfDay(referenceDate),
                                    lte: endOfDay(referenceDate)
                                }
                            }
                        }
                    }
            }
        }
    });
    const parseDurationDays = (duration) => {
        if (!duration)
            return 1;
        const match = duration.match(/(\d+)/);
        if (!match)
            return 1;
        const days = Number(match[1]);
        return Number.isNaN(days) ? 1 : Math.max(days, 1);
    };
    const formatted = [];
    for (const reminder of reminders) {
        const startDateRaw = ((_a = reminder.medication) === null || _a === void 0 ? void 0 : _a.startDate) || reminder.createdAt || today;
        const startDate = startOfDay(startDateRaw);
        const durationDays = parseDurationDays(reminder.duration);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + durationDays - 1);
        const referenceStart = referenceDate ? startOfDay(referenceDate).getTime() : null;
        if (!showAllReminders) {
            const inWindow = referenceStart >= startDate.getTime() && referenceStart <= endDate.getTime();
            if (!inWindow) {
                continue;
            }
        }
        const scheduledTimes = getScheduledTimesForReminder(reminder);
        const dayLogs = ((_b = reminder.medication) === null || _b === void 0 ? void 0 : _b.logs) ? [...reminder.medication.logs] : [];
        const slots = [];
        for (const timeStr of scheduledTimes) {
            if (!referenceDate) {
                slots.push({
                    time: timeStr,
                    status: null
                });
                continue;
            }
            const reminderDateTime = combineDateAndTime(referenceDate, timeStr);
            const referenceDay = startOfDay(referenceDate);
            const matchedLogIndex = dayLogs.findIndex(log => formatTimeFromDate(new Date(log.occurredAt)) === timeStr);
            let slotStatus = matchedLogIndex >= 0 ? dayLogs[matchedLogIndex].status : null;
            if (reminder.medicationId && !slotStatus) {
                const isPastDate = referenceDay < startOfDay(today);
                const isToday = isSameDay(referenceDate, today);
                if (isPastDate || (isToday && reminderDateTime < today)) {
                    const createdLog = yield prisma_1.default.medicationLog.create({
                        data: {
                            medicationId: reminder.medicationId,
                            occurredAt: reminderDateTime,
                            status: 'missed'
                        }
                    });
                    slotStatus = createdLog.status;
                    dayLogs.push(createdLog);
                }
            }
            slots.push({
                time: timeStr,
                status: slotStatus
            });
        }
        let status = null;
        if (!showAllReminders && slots.length) {
            if (slots.every(slot => slot.status === 'taken')) {
                status = 'taken';
            }
            else if (slots.every(slot => slot.status === 'missed')) {
                status = 'missed';
            }
        }
        formatted.push(Object.assign(Object.assign({}, reminder), { status, startDate: startDateRaw, slots }));
    }
    res.status(200).json({
        status: 200,
        reminders: formatted
    });
});
exports.listMedicineReminders = listMedicineReminders;
const getMedicineReminder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const user = ensureUser(req, res);
    if (!user)
        return;
    const reminderId = req.params.id;
    if (!reminderId) {
        return res.status(400).json({
            status: 400,
            message: 'Reminder id is required.'
        });
    }
    const reminder = yield ensureReminderForUser(user.id, reminderId);
    if (!reminder) {
        return res.status(404).json({
            status: 404,
            message: 'Reminder not found.'
        });
    }
    res.status(200).json({
        status: 200,
        reminder: Object.assign(Object.assign({}, reminder), { startDate: ((_a = reminder.medication) === null || _a === void 0 ? void 0 : _a.startDate) || reminder.createdAt })
    });
});
exports.getMedicineReminder = getMedicineReminder;
const createMedicineReminder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { profileId, medicineName, unit, dosage, frequency, time, duration, intakeMethod, notes } = req.body;
    const startDateInput = req.body.startDate;
    const timesInput = Array.isArray(req.body.times) ? req.body.times : [];
    const normalizedTimes = timesInput.map((value) => normalizeTimeValue(value)).filter(Boolean);
    const fallbackTime = normalizeTimeValue(time);
    const scheduleTimes = normalizedTimes.length ? normalizedTimes : (fallbackTime ? [fallbackTime] : []);
    if (!profileId || !medicineName || !frequency) {
        return res.status(400).json({
            status: 400,
            message: 'profileId, medicineName and frequency are required.'
        });
    }
    let reminderStartDate = null;
    if (startDateInput) {
        const parsed = new Date(startDateInput);
        if (Number.isNaN(parsed.getTime())) {
            return res.status(400).json({
                status: 400,
                message: 'Invalid startDate format.'
            });
        }
        reminderStartDate = parsed;
    }
    const profile = yield resolveProfileForUser(user.id, profileId);
    if (!profile) {
        return res.status(404).json({
            status: 404,
            message: 'Profile not found for current user.'
        });
    }
    const medication = yield prisma_1.default.medication.create({
        data: {
            profileId: profile.id,
            name: medicineName,
            dosage: `${dosage || 1} ${unit || ''}`.trim(),
            instructions: intakeMethod || '',
            startDate: reminderStartDate || new Date()
        }
    });
    const reminder = yield prisma_1.default.medicineReminder.create({
        data: {
            profileId: profile.id,
            medicationId: medication.id,
            medicineName,
            unit,
            dosage: typeof dosage === 'number' ? dosage : Number(dosage) || 1,
            frequency,
            time: scheduleTimes[0] || null,
            times: scheduleTimes,
            duration,
            intakeMethod,
            notes
        }
    });
    res.status(201).json({
        status: 201,
        reminder: Object.assign(Object.assign({}, reminder), { startDate: reminderStartDate || reminder.createdAt })
    });
});
exports.createMedicineReminder = createMedicineReminder;
const updateMedicineReminder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const reminderId = req.params.id;
    const existing = yield ensureReminderForUser(user.id, reminderId);
    if (!existing) {
        return res.status(404).json({
            status: 404,
            message: 'Reminder not found.'
        });
    }
    const { medicineName, unit, dosage, frequency, time, duration, intakeMethod, notes, active, startDate, times } = req.body;
    const data = {};
    if (typeof medicineName !== 'undefined')
        data.medicineName = medicineName;
    if (typeof unit !== 'undefined')
        data.unit = unit;
    if (typeof dosage !== 'undefined') {
        const parsed = Number(dosage);
        if (!Number.isNaN(parsed))
            data.dosage = parsed;
    }
    if (typeof frequency !== 'undefined')
        data.frequency = frequency;
    if (typeof time !== 'undefined')
        data.time = time;
    if (typeof duration !== 'undefined')
        data.duration = duration;
    if (typeof intakeMethod !== 'undefined')
        data.intakeMethod = intakeMethod;
    if (typeof notes !== 'undefined')
        data.notes = notes;
    if (typeof active !== 'undefined')
        data.active = Boolean(active);
    if (typeof times !== 'undefined') {
        if (Array.isArray(times)) {
            const normalized = times.map((value) => normalizeTimeValue(value)).filter(Boolean);
            data.times = normalized;
            data.time = normalized[0] || data.time;
        }
        else {
            const normalizedSingle = normalizeTimeValue(times);
            if (normalizedSingle) {
                data.times = [normalizedSingle];
                data.time = normalizedSingle;
            }
        }
    }
    if (existing.medicationId) {
        const medicationData = {};
        if (typeof medicineName !== 'undefined')
            medicationData.name = medicineName;
        if (typeof intakeMethod !== 'undefined')
            medicationData.instructions = intakeMethod;
        if (typeof dosage !== 'undefined' || typeof unit !== 'undefined') {
            const newDosage = typeof dosage !== 'undefined' ? dosage : existing.dosage;
            const newUnit = typeof unit !== 'undefined' ? unit : existing.unit;
            medicationData.dosage = `${newDosage || 1} ${newUnit || ''}`.trim();
        }
        if (typeof startDate !== 'undefined') {
            const parsedStart = new Date(startDate);
            if (!Number.isNaN(parsedStart.getTime())) {
                medicationData.startDate = parsedStart;
            }
        }
        if (typeof startDate !== 'undefined') {
            const parsedStart = new Date(startDate);
            if (!Number.isNaN(parsedStart.getTime())) {
                medicationData.startDate = parsedStart;
            }
        }
        if (Object.keys(medicationData).length) {
            yield prisma_1.default.medication.update({
                where: { id: existing.medicationId },
                data: medicationData
            });
        }
    }
    const reminder = yield prisma_1.default.medicineReminder.update({
        where: { id: reminderId },
        data
    });
    res.status(200).json({
        status: 200,
        reminder
    });
});
exports.updateMedicineReminder = updateMedicineReminder;
const deleteMedicineReminder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const reminderId = req.params.id;
    const existing = yield ensureReminderForUser(user.id, reminderId);
    if (!existing) {
        return res.status(404).json({
            status: 404,
            message: 'Reminder not found.'
        });
    }
    yield prisma_1.default.medicineReminder.delete({
        where: { id: reminderId }
    });
    if (existing.medicationId) {
        yield prisma_1.default.medication.delete({
            where: { id: existing.medicationId }
        });
    }
    res.status(200).json({
        status: 200,
        message: 'Reminder deleted successfully.'
    });
});
exports.deleteMedicineReminder = deleteMedicineReminder;
const setMedicineReminderStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const reminderId = req.params.id;
    const { status, date, time } = req.body;
    if (!['taken', 'missed', 'pending'].includes(status)) {
        return res.status(400).json({
            status: 400,
            message: 'Invalid status. Use taken, missed, or pending.'
        });
    }
    const reminder = yield ensureReminderForUser(user.id, reminderId);
    if (!reminder || !reminder.medicationId) {
        return res.status(404).json({
            status: 404,
            message: 'Reminder not found.'
        });
    }
    const scheduleTimes = getScheduledTimesForReminder(reminder);
    const normalizedTime = normalizeTimeValue(time) || scheduleTimes[0];
    if (!normalizedTime || !scheduleTimes.includes(normalizedTime)) {
        return res.status(400).json({
            status: 400,
            message: 'Invalid time slot for this reminder.'
        });
    }
    const referenceDate = parseReferenceDate(date) || new Date();
    const logDateTime = combineDateAndTime(referenceDate, normalizedTime);
    const existingLog = yield getLogForExactDateTime(reminder.medicationId, logDateTime);
    if (status === 'pending') {
        if (existingLog) {
            yield prisma_1.default.medicationLog.delete({
                where: { id: existingLog.id }
            });
        }
        return res.status(200).json({
            status: 200,
            log: null,
            time: normalizedTime
        });
    }
    if (existingLog) {
        const updated = yield prisma_1.default.medicationLog.update({
            where: { id: existingLog.id },
            data: {
                status
            }
        });
        return res.status(200).json({
            status: 200,
            log: updated,
            time: normalizedTime
        });
    }
    else {
        const created = yield prisma_1.default.medicationLog.create({
            data: {
                medicationId: reminder.medicationId,
                occurredAt: logDateTime,
                status
            }
        });
        return res.status(200).json({
            status: 200,
            log: created,
            time: normalizedTime
        });
    }
});
exports.setMedicineReminderStatus = setMedicineReminderStatus;
