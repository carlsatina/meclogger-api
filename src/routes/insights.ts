import { RequestHandler, Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { getHealthInsights, extractPrescriptionHandler, extractLabReportHandler } from '../controller/insightsController'

const makeInsightsRouter = (
    _dbClient: PrismaClient,
    authenticateUser: RequestHandler
): Router => {
    const router = Router()
    router.get('/health', authenticateUser, getHealthInsights)
    router.post('/extract-prescription', authenticateUser, extractPrescriptionHandler)
    router.post('/extract-lab-report', authenticateUser, extractLabReportHandler)
    return router
}

export default makeInsightsRouter
