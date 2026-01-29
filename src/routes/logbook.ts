import { RequestHandler, Router } from 'express'
import { PrismaClient } from '@prisma/client'
import {
    listLogbookPayments,
    createLogbookPayment,
    updateLogbookPayment,
    deleteLogbookPayment,
    createLogbookRenter,
    listLogbookRenters,
    updateLogbookRenter,
    getLogbookRenter,
    listLogbookSavings,
    createLogbookSaving,
    updateLogbookSaving,
    listLogbookBorrowed,
    createLogbookBorrowed,
    updateLogbookBorrowed,
    importLogbookPayments
} from '../controller/logbookController'

const makeLogbookRouter = (
    _dbClient: PrismaClient,
    authenticateUser: RequestHandler
): Router => {
    const router = Router()

    router.get('/payments', authenticateUser, listLogbookPayments)
    router.post('/payments', authenticateUser, createLogbookPayment)
    router.put('/payments/:id', authenticateUser, updateLogbookPayment)
    router.delete('/payments/:id', authenticateUser, deleteLogbookPayment)
    router.post('/renters', authenticateUser, createLogbookRenter)
    router.get('/renters', authenticateUser, listLogbookRenters)
    router.get('/renters/:id', authenticateUser, getLogbookRenter)
    router.put('/renters/:id', authenticateUser, updateLogbookRenter)
    router.get('/savings', authenticateUser, listLogbookSavings)
    router.post('/savings', authenticateUser, createLogbookSaving)
    router.put('/savings/:id', authenticateUser, updateLogbookSaving)
    router.get('/borrowed', authenticateUser, listLogbookBorrowed)
    router.post('/borrowed', authenticateUser, createLogbookBorrowed)
    router.put('/borrowed/:id', authenticateUser, updateLogbookBorrowed)
    router.post('/import/payments', authenticateUser, importLogbookPayments)

    return router
}

export default makeLogbookRouter
