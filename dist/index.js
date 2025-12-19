"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./src/routes/auth"));
const vitals_1 = __importDefault(require("./src/routes/vitals"));
const profile_1 = __importDefault(require("./src/routes/profile"));
const medicalRecords_1 = __importDefault(require("./src/routes/medicalRecords"));
const medicineReminders_1 = __importDefault(require("./src/routes/medicineReminders"));
const carMaintenance_1 = __importDefault(require("./src/routes/carMaintenance"));
const expense_1 = __importDefault(require("./src/routes/expense"));
const prisma_1 = __importDefault(require("./lib/prisma"));
const cors_1 = __importDefault(require("cors"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const multer_1 = __importDefault(require("multer"));
const limits_1 = require("./src/config/limits");
const cors_2 = require("./src/config/cors");
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT;
const dbClient = prisma_1.default;
app.use((0, cors_1.default)(cors_2.corsOptions));
app.options(/.*/, (0, cors_1.default)(cors_2.corsOptions));
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        return res.sendStatus(cors_2.corsOptions.optionsSuccessStatus || 200);
    }
    next();
});
app.use(express_1.default.static('public'));
app.use(express_1.default.json({ limit: limits_1.REQUEST_BODY_LIMIT }));
app.use(express_1.default.urlencoded({ limit: limits_1.REQUEST_BODY_LIMIT, extended: true }));
app.use('/logo', express_1.default.static("./uploaded-images/logo"));
app.use('/portfolio', express_1.default.static("./uploaded-images/portfolio"));
app.use('/records', express_1.default.static("./uploaded-images/records"));
app.use('/vehicles', express_1.default.static("./uploaded-images/vehicles"));
app.get('/', (req, res) => {
    res.send("Hello World!");
});
function authenticateUser(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {
        console.log("token is Null!");
        return res.status(400);
    }
    jsonwebtoken_1.default.verify(token, process.env.ACCESS_TOKEN_SECRET || 'defaultSecret', (err, user) => {
        if (err)
            return res.status(403);
        req.user = user;
        next();
    });
}
//app.use('/api/v1/services', servicesRouter(dbClient, authenticateUser, uploadLogo))
app.use('/api/v1/auth', (0, auth_1.default)(dbClient, authenticateUser));
app.use('/api/v1/vitals', (0, vitals_1.default)(dbClient, authenticateUser));
app.use('/api/v1/profiles', (0, profile_1.default)(dbClient, authenticateUser));
app.use('/api/v1/medical-records', (0, medicalRecords_1.default)(dbClient, authenticateUser));
app.use('/api/v1/medicine-reminders', (0, medicineReminders_1.default)(dbClient, authenticateUser));
app.use('/api/v1/car-maintenance', (0, carMaintenance_1.default)(dbClient, authenticateUser));
app.use('/api/v1/expenses', (0, expense_1.default)(dbClient, authenticateUser));
// Global error handler for uploads and other middleware
app.use((err, _req, res, _next) => {
    if ((err === null || err === void 0 ? void 0 : err.type) === 'entity.too.large' || (err === null || err === void 0 ? void 0 : err.status) === 413) {
        return res.status(413).json({
            status: 413,
            message: `Request too large. Maximum allowed payload is ${limits_1.REQUEST_BODY_LIMIT}.`
        });
    }
    if (err instanceof multer_1.default.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                status: 413,
                message: `File too large. Maximum size is ${limits_1.MEDICAL_RECORD_MAX_FILE_MB}MB per file.`
            });
        }
        return res.status(400).json({
            status: 400,
            message: err.message || 'File upload error.'
        });
    }
    console.error('Unhandled error:', err);
    return res.status(500).json({
        status: 500,
        message: 'Unexpected server error.'
    });
});
const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "REST api for Health Records Documentation",
            version: "1.0.0"
        },
        schemes: ["http", "https"],
        servers: [
            {
                url: `${process.env.API_DOC_URL}:${port}`
            }
        ]
    },
    apis: ["./apis/*.ts"]
};
const spacs = (0, swagger_jsdoc_1.default)(options);
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(spacs));
app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
