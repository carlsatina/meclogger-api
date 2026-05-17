import { RequestHandler, Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { createLabResult, listLabResults, deleteLabResult } from '../controller/labResultController'

const makeLabResultsRouter = (
    _dbClient: PrismaClient,
    authenticateUser: RequestHandler
): Router => {
    const router = Router()
    router.get('/', authenticateUser, listLabResults)
    router.post('/', authenticateUser, createLabResult)
    router.delete('/:id', authenticateUser, deleteLabResult)
    return router
}

export default makeLabResultsRouter
