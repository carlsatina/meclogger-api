"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const medicineReminderController_1 = require("../controller/medicineReminderController");
const makeMedicineReminderRouter = (_dbClient, authenticateUser) => {
    const router = (0, express_1.Router)();
    router.get('/', authenticateUser, medicineReminderController_1.listMedicineReminders);
    router.get('/:id', authenticateUser, medicineReminderController_1.getMedicineReminder);
    router.post('/', authenticateUser, medicineReminderController_1.createMedicineReminder);
    router.put('/:id', authenticateUser, medicineReminderController_1.updateMedicineReminder);
    router.post('/:id/logs', authenticateUser, medicineReminderController_1.setMedicineReminderStatus);
    router.delete('/:id', authenticateUser, medicineReminderController_1.deleteMedicineReminder);
    return router;
};
exports.default = makeMedicineReminderRouter;
