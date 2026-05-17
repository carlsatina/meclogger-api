import { RequestHandler, Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { createMedication, listMedications, updateMedication, deleteMedication, logDose } from '../controller/medicationController'

const makeMedicationsRouter = (
    _dbClient: PrismaClient,
    authenticateUser: RequestHandler
): Router => {
    const router = Router()
    router.get('/', authenticateUser, listMedications)
    router.post('/', authenticateUser, createMedication)
    router.patch('/:id', authenticateUser, updateMedication)
    router.delete('/:id', authenticateUser, deleteMedication)
    router.post('/:id/log', authenticateUser, logDose)
    return router
}

export default makeMedicationsRouter
