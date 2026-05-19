import { RequestHandler, Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { getHealthInsights, getSpendingInsights, extractPrescriptionHandler, extractLabReportHandler, getLogbookInsights, getLogbookAudit } from '../controller/insightsController'

const makeInsightsRouter = (
    _dbClient: PrismaClient,
    authenticateUser: RequestHandler
): Router => {
    const router = Router()
    router.get('/health', authenticateUser, getHealthInsights)
    router.get('/spending', authenticateUser, getSpendingInsights)
    router.post('/extract-prescription', authenticateUser, extractPrescriptionHandler)
    router.post('/extract-lab-report', authenticateUser, extractLabReportHandler)
    router.get('/logbook', authenticateUser, getLogbookInsights)
    router.get('/logbook/audit', authenticateUser, getLogbookAudit)
    return router
}

export default makeInsightsRouter
