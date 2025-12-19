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
exports.listProfiles = exports.createFamilyMember = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
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
const createFamilyMember = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { displayName, relationToUser, dateOfBirth, gender, bloodGroup, allergies, chronicConditions } = req.body;
    if (!displayName || typeof displayName !== 'string') {
        return res.status(400).json({
            status: 400,
            message: 'displayName is required.'
        });
    }
    try {
        const profile = yield prisma_1.default.profile.create({
            data: {
                userId: user.id,
                displayName,
                relationToUser,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                gender,
                bloodGroup,
                allergies,
                chronicConditions
            },
            include: {
                records: true,
                vitals: true
            }
        });
        return res.status(201).json({
            status: 201,
            profile
        });
    }
    catch (error) {
        console.error('createFamilyMember error', error);
        return res.status(500).json({
            status: 500,
            message: 'Unable to create family member profile.',
            error: error.message
        });
    }
});
exports.createFamilyMember = createFamilyMember;
const listProfiles = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    try {
        const profiles = yield prisma_1.default.profile.findMany({
            where: {
                userId: user.id
            },
            include: {
                records: true,
                vitals: true
            },
            orderBy: {
                createdAt: 'asc'
            }
        });
        return res.status(200).json({
            status: 200,
            profiles
        });
    }
    catch (error) {
        console.error('listProfiles error', error);
        return res.status(500).json({
            status: 500,
            message: 'Unable to fetch profiles.',
            error: error.message
        });
    }
});
exports.listProfiles = listProfiles;
