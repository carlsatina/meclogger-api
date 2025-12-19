import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import authRouter from './src/routes/auth'
import vitalsRouter from './src/routes/vitals'
import profileRouter from './src/routes/profile'
import medicalRecordsRouter from './src/routes/medicalRecords'
import medicineReminderRouter from './src/routes/medicineReminders'
import carMaintenanceRouter from './src/routes/carMaintenance'
import expenseRouter from './src/routes/expense'
import prisma from './lib/prisma'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import { uploadLogo } from './src/middlewares/uploadLogo';
import multer from 'multer'
import { REQUEST_BODY_LIMIT, MEDICAL_RECORD_MAX_FILE_MB } from './src/config/limits'
import { corsOptions } from './src/config/cors'

import swaggerJSDoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'


dotenv.config();

const app: Express = express();
const port = process.env.PORT;

const dbClient = prisma

app.use(cors(corsOptions))
app.options(/.*/, cors(corsOptions))
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        return res.sendStatus(corsOptions.optionsSuccessStatus || 200)
    }
    next()
})
app.use(express.static('public'))
app.use(express.json({ limit: REQUEST_BODY_LIMIT }))
app.use(express.urlencoded({ limit: REQUEST_BODY_LIMIT, extended: true }))

app.use('/logo', express.static("./uploaded-images/logo"))
app.use('/portfolio', express.static("./uploaded-images/portfolio"))
app.use('/records', express.static("./uploaded-images/records"))
app.use('/vehicles', express.static("./uploaded-images/vehicles"))

app.get('/', (req, res) => {
    res.send("Hello World!")
})

function authenticateUser (req:any, res:any , next: any) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token == null) {
        console.log("token is Null!")
        return res.status(400)
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || 'defaultSecret', (err: any, user: any) => {
        if (err) return res.status(403)
        req.user = user
        next()
    })
}

//app.use('/api/v1/services', servicesRouter(dbClient, authenticateUser, uploadLogo))
app.use('/api/v1/auth', authRouter(dbClient, authenticateUser))
app.use('/api/v1/vitals', vitalsRouter(dbClient, authenticateUser))
app.use('/api/v1/profiles', profileRouter(dbClient, authenticateUser))
app.use('/api/v1/medical-records', medicalRecordsRouter(dbClient, authenticateUser))
app.use('/api/v1/medicine-reminders', medicineReminderRouter(dbClient, authenticateUser))
app.use('/api/v1/car-maintenance', carMaintenanceRouter(dbClient, authenticateUser))
app.use('/api/v1/expenses', expenseRouter(dbClient, authenticateUser))

// Global error handler for uploads and other middleware
app.use((err: any, _req: any, res: any, _next: any) => {
    if (err?.type === 'entity.too.large' || err?.status === 413) {
        return res.status(413).json({
            status: 413,
            message: `Request too large. Maximum allowed payload is ${REQUEST_BODY_LIMIT}.`
        })
    }
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                status: 413,
                message: `File too large. Maximum size is ${MEDICAL_RECORD_MAX_FILE_MB}MB per file.`
            })
        }
        return res.status(400).json({
            status: 400,
            message: err.message || 'File upload error.'
        })
    }
    console.error('Unhandled error:', err)
    return res.status(500).json({
        status: 500,
        message: 'Unexpected server error.'
    })
})

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
}
const spacs = swaggerJSDoc(options)
app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(spacs)
)
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
