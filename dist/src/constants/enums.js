"use strict";
// Shared enums that match Prisma schema
// These should be kept in sync with backend/prisma/schema.prisma
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseFrequency = exports.PaymentMethod = exports.MaintenanceType = exports.VehicleType = exports.IllnessStatus = exports.IllnessSeverity = exports.ReminderFrequency = exports.VitalType = exports.RecordType = exports.Role = void 0;
var Role;
(function (Role) {
    Role["GUEST"] = "GUEST";
    Role["USER"] = "USER";
    Role["ADMIN"] = "ADMIN";
})(Role || (exports.Role = Role = {}));
var RecordType;
(function (RecordType) {
    RecordType["PRESCRIPTION"] = "PRESCRIPTION";
    RecordType["DIAGNOSIS"] = "DIAGNOSIS";
    RecordType["LAB_RESULT"] = "LAB_RESULT";
    RecordType["IMAGING"] = "IMAGING";
    RecordType["VACCINATION"] = "VACCINATION";
    RecordType["DISCHARGE_SUMMARY"] = "DISCHARGE_SUMMARY";
    RecordType["OTHER"] = "OTHER";
})(RecordType || (exports.RecordType = RecordType = {}));
var VitalType;
(function (VitalType) {
    VitalType["HEART_RATE"] = "HEART_RATE";
    VitalType["BLOOD_PRESSURE_SYSTOLIC"] = "BLOOD_PRESSURE_SYSTOLIC";
    VitalType["BLOOD_PRESSURE_DIASTOLIC"] = "BLOOD_PRESSURE_DIASTOLIC";
    VitalType["BLOOD_GLUCOSE"] = "BLOOD_GLUCOSE";
    VitalType["SPO2"] = "SPO2";
    VitalType["TEMPERATURE"] = "TEMPERATURE";
    VitalType["WEIGHT"] = "WEIGHT";
    VitalType["HEIGHT"] = "HEIGHT";
    VitalType["BMI"] = "BMI";
    VitalType["RESPIRATORY_RATE"] = "RESPIRATORY_RATE";
    VitalType["OTHER"] = "OTHER";
})(VitalType || (exports.VitalType = VitalType = {}));
var ReminderFrequency;
(function (ReminderFrequency) {
    ReminderFrequency["ONCE"] = "ONCE";
    ReminderFrequency["HOURLY"] = "HOURLY";
    ReminderFrequency["DAILY"] = "DAILY";
    ReminderFrequency["WEEKLY"] = "WEEKLY";
    ReminderFrequency["CUSTOM"] = "CUSTOM";
})(ReminderFrequency || (exports.ReminderFrequency = ReminderFrequency = {}));
var IllnessSeverity;
(function (IllnessSeverity) {
    IllnessSeverity["MILD"] = "MILD";
    IllnessSeverity["MODERATE"] = "MODERATE";
    IllnessSeverity["SEVERE"] = "SEVERE";
    IllnessSeverity["CRITICAL"] = "CRITICAL";
})(IllnessSeverity || (exports.IllnessSeverity = IllnessSeverity = {}));
var IllnessStatus;
(function (IllnessStatus) {
    IllnessStatus["ONGOING"] = "ONGOING";
    IllnessStatus["RECOVERED"] = "RECOVERED";
    IllnessStatus["RESOLVED"] = "RESOLVED";
    IllnessStatus["CHRONIC"] = "CHRONIC";
})(IllnessStatus || (exports.IllnessStatus = IllnessStatus = {}));
var VehicleType;
(function (VehicleType) {
    VehicleType["CAR"] = "CAR";
    VehicleType["SUV"] = "SUV";
    VehicleType["PICKUP"] = "PICKUP";
    VehicleType["MOTORCYCLE"] = "MOTORCYCLE";
    VehicleType["TRUCK"] = "TRUCK";
    VehicleType["VAN"] = "VAN";
    VehicleType["OTHER"] = "OTHER";
})(VehicleType || (exports.VehicleType = VehicleType = {}));
var MaintenanceType;
(function (MaintenanceType) {
    MaintenanceType["OIL_CHANGE"] = "OIL_CHANGE";
    MaintenanceType["BRAKE_PAD_REPLACEMENT"] = "BRAKE_PAD_REPLACEMENT";
    MaintenanceType["TIRE_ROTATION"] = "TIRE_ROTATION";
    MaintenanceType["TIRE_REPLACEMENT"] = "TIRE_REPLACEMENT";
    MaintenanceType["BATTERY_REPLACEMENT"] = "BATTERY_REPLACEMENT";
    MaintenanceType["AIR_FILTER_REPLACEMENT"] = "AIR_FILTER_REPLACEMENT";
    MaintenanceType["TRANSMISSION_SERVICE"] = "TRANSMISSION_SERVICE";
    MaintenanceType["COOLANT_FLUSH"] = "COOLANT_FLUSH";
    MaintenanceType["SPARK_PLUG_REPLACEMENT"] = "SPARK_PLUG_REPLACEMENT";
    MaintenanceType["BRAKE_FLUID_CHANGE"] = "BRAKE_FLUID_CHANGE";
    MaintenanceType["ALIGNMENT"] = "ALIGNMENT";
    MaintenanceType["INSPECTION"] = "INSPECTION";
    MaintenanceType["REPAIR"] = "REPAIR";
    MaintenanceType["OTHER"] = "OTHER";
})(MaintenanceType || (exports.MaintenanceType = MaintenanceType = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["CREDIT_CARD"] = "CREDIT_CARD";
    PaymentMethod["DEBIT_CARD"] = "DEBIT_CARD";
    PaymentMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
    PaymentMethod["MOBILE_PAYMENT"] = "MOBILE_PAYMENT";
    PaymentMethod["CHECK"] = "CHECK";
    PaymentMethod["OTHER"] = "OTHER";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var ExpenseFrequency;
(function (ExpenseFrequency) {
    ExpenseFrequency["ONE_TIME"] = "ONE_TIME";
    ExpenseFrequency["DAILY"] = "DAILY";
    ExpenseFrequency["WEEKLY"] = "WEEKLY";
    ExpenseFrequency["MONTHLY"] = "MONTHLY";
    ExpenseFrequency["QUARTERLY"] = "QUARTERLY";
    ExpenseFrequency["YEARLY"] = "YEARLY";
})(ExpenseFrequency || (exports.ExpenseFrequency = ExpenseFrequency = {}));
