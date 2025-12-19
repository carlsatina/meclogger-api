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
exports.updateUserRole = exports.listUsers = exports.getProfile = exports.register = exports.login = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv = __importStar(require("dotenv"));
const bcrypt_1 = __importDefault(require("bcrypt"));
dotenv.config();
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const input = req.body;
    const { email, password } = input;
    let user = yield prisma_1.default.user.findFirst({
        where: {
            email
        }
    });
    if (user) {
        if (yield bcrypt_1.default.compare(password, user.password || '')) {
            const userObj = {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role
            };
            const accessToken = jsonwebtoken_1.default.sign(userObj, process.env.ACCESS_TOKEN_SECRET || 'defaultSecret1234');
            res.json({
                status: 201,
                token: accessToken
            });
        }
        else {
            res.status(403).json({
                status: 403,
                message: 'User credentials does not match!'
            });
        }
    }
    else {
        res.status(400).json({
            status: 400,
            message: 'User does not exist!'
        });
    }
});
exports.login = login;
// a bcrypt configuration
const saltRounds = 10;
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let hashedPassword = '';
    const input = Object.assign({}, req.body);
    try {
        if (input.password != input.verifyPassword) {
            return res.status(400).json({
                status: 400,
                message: "Verify Password does not match"
            });
        }
        else {
            hashedPassword = yield bcrypt_1.default.hash(input.password, saltRounds);
        }
    }
    catch (err) {
        res.status(400).json({
            status: 400,
            message: err.message
        });
    }
    delete input.verifyPassword;
    input.password = hashedPassword;
    // Force role to GUEST on registration
    input.role = client_1.Role.GUEST;
    try {
        // create the user
        const user = yield prisma_1.default.user.create({
            data: Object.assign({}, input)
        });
        res.status(201).json({
            status: 201,
            message: "Registration successful!"
        });
    }
    catch (e) {
        if (e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            return res.status(409).json({
                status: 409,
                message: 'Account already exists for this email or phone.'
            });
        }
        console.log("error: ", e);
        res.status(500).json({
            status: 500,
            message: 'Registration failed. Please try again.'
        });
    }
});
exports.register = register;
const getProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (req.user) {
        res.status(201).json({
            status: 201,
            userInfo: req.user
        });
    }
    else {
        res.status(401).json({
            status: 401,
            message: "User does not exist!"
        });
    }
});
exports.getProfile = getProfile;
const listUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user || req.user.role !== client_1.Role.ADMIN) {
        return res.status(403).json({ status: 403, message: 'Admin access required' });
    }
    const users = yield prisma_1.default.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, fullName: true, email: true, phone: true, role: true, createdAt: true }
    });
    res.status(200).json({ status: 200, users });
});
exports.listUsers = listUsers;
const updateUserRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user || req.user.role !== client_1.Role.ADMIN) {
        return res.status(403).json({ status: 403, message: 'Admin access required' });
    }
    const { id } = req.params;
    const { role } = req.body || {};
    if (!id || !role || !Object.values(client_1.Role).includes(role)) {
        return res.status(400).json({ status: 400, message: 'Valid user id and role are required' });
    }
    if (req.user.id === id && role === client_1.Role.GUEST) {
        return res.status(400).json({ status: 400, message: 'Cannot downgrade self to guest' });
    }
    try {
        const updated = yield prisma_1.default.user.update({
            where: { id },
            data: { role }
        });
        res.status(200).json({ status: 200, user: { id: updated.id, role: updated.role } });
    }
    catch (e) {
        if (e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            return res.status(404).json({ status: 404, message: 'User not found' });
        }
        res.status(500).json({ status: 500, message: 'Unable to update role' });
    }
});
exports.updateUserRole = updateUserRole;
