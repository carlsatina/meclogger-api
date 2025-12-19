"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const pg_1 = require("pg");
const prismaEnvPath = path_1.default.resolve(process.cwd(), 'prisma/.env');
dotenv_1.default.config({ path: prismaEnvPath });
dotenv_1.default.config();
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL is not set in the environment');
}
const parseBoolean = (val, fallback) => {
    if (val === undefined)
        return fallback;
    return ['1', 'true', 'yes', 'on'].includes(val.toLowerCase());
};
const readCaFromEnv = () => {
    const inlineCa = process.env.DB_SSL_CA;
    if (inlineCa && inlineCa.trim().length > 0) {
        return inlineCa;
    }
    const inlineCaB64 = process.env.DB_SSL_CA_B64;
    if (inlineCaB64 && inlineCaB64.trim().length > 0) {
        try {
            return Buffer.from(inlineCaB64, 'base64').toString('utf8');
        }
        catch (_a) {
            throw new Error('Invalid base64 content in DB_SSL_CA_B64');
        }
    }
    return null;
};
const getSslConfig = () => {
    // Allow disabling SSL entirely (e.g., local Postgres without TLS).
    const disableSsl = parseBoolean(process.env.DB_SSL_DISABLE, false);
    if (disableSsl) {
        return false;
    }
    const rejectUnauthorized = parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, true);
    const { hostname } = new URL(connectionString);
    const servername = process.env.DB_SSL_SERVERNAME || hostname;
    const caFromEnv = readCaFromEnv();
    if (caFromEnv) {
        return { ca: caFromEnv, rejectUnauthorized, servername };
    }
    const envCaPath = process.env.DB_SSL_CA_PATH;
    const defaultCaPath = path_1.default.resolve(process.cwd(), 'certs', 'db-ca.crt');
    const chosenPath = envCaPath
        ? path_1.default.resolve(process.cwd(), envCaPath)
        : defaultCaPath;
    if (fs_1.default.existsSync(chosenPath)) {
        const ca = fs_1.default.readFileSync(chosenPath, 'utf8');
        return { ca, rejectUnauthorized, servername };
    }
    // Development or explicit override fallback without CA.
    if (process.env.NODE_ENV === 'development' || rejectUnauthorized === false) {
        return { rejectUnauthorized: false, servername };
    }
    throw new Error('DB_SSL_CA_PATH is required for secure TLS with your provider. ' +
        'Set DB_SSL_CA_PATH (or DB_SSL_CA / DB_SSL_CA_B64) to the root CA file path.');
};
const pool = new pg_1.Pool({
    connectionString,
    ssl: getSslConfig(),
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
exports.default = prisma;
