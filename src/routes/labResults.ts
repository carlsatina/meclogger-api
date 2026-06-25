import { RequestHandler, Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { createLabResult, listLabResults, getLabExplanation, updateLabResult, deleteLabResult } from '../controller/labResultController'

const makeLabResultsRouter = (
    _dbClient: PrismaClient,
    authenticateUser: RequestHandler
): Router => {
    const router = Router()
    router.get('/', authenticateUser, listLabResults)
    router.get('/explain', authenticateUser, getLabExplanation)
    router.post('/', authenticateUser, createLabResult)
    router.patch('/:id', authenticateUser, updateLabResult)
    router.delete('/:id', authenticateUser, deleteLabResult)
    return router
}

export default makeLabResultsRouter
