"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const medicalRecordController_1 = require("../controller/medicalRecordController");
const uploadMedicalRecords_1 = __importDefault(require("../middlewares/uploadMedicalRecords"));
const makeMedicalRecordsRouter = (_dbClient, authenticateUser) => {
    const router = (0, express_1.Router)();
    router.get('/', authenticateUser, medicalRecordController_1.listMedicalRecords);
    router.get('/:id', authenticateUser, medicalRecordController_1.getMedicalRecord);
    router.post('/', authenticateUser, uploadMedicalRecords_1.default.array('files', 5), medicalRecordController_1.createMedicalRecord);
    router.put('/:id', authenticateUser, uploadMedicalRecords_1.default.array('files', 5), medicalRecordController_1.updateMedicalRecord);
    router.delete('/:id', authenticateUser, medicalRecordController_1.deleteMedicalRecord);
    return router;
};
exports.default = makeMedicalRecordsRouter;
