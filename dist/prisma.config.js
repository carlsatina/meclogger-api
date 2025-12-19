"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const config_1 = require("@prisma/config");
const prismaEnvPath = path_1.default.resolve(process.cwd(), 'prisma/.env');
dotenv_1.default.config({ path: prismaEnvPath });
dotenv_1.default.config();
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;
exports.default = (0, config_1.defineConfig)({
    schema: './prisma/schema.prisma',
    datasource: Object.assign({ url: (0, config_1.env)('DATABASE_URL') }, (shadowDatabaseUrl ? { shadowDatabaseUrl } : {})),
});
