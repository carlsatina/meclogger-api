import { RequestHandler, Router } from 'express'
import { PrismaClient } from '@prisma/client'
import {
    createBloodPressureRecord,
    updateBloodPressureRecord,
    getBloodPressureRecord,
    createBloodSugarRecord,
    updateBloodSugarRecord,
    getBloodSugarRecord,
    createBodyWeightRecord,
    updateBodyWeightRecord,
    getBodyWeightRecord,
    getBodyWeightRecords,
    getBloodPressureRecords,
    getBloodSugarRecords,
    createIllnessRecord,
    getIllnessRecords,
    getIllnessRecord,
    updateIllnessRecord,
    deleteIllnessRecord
} from '../controller/vitalsController'

const makeVitalsRouter = (
    _dbClient: PrismaClient,
    authenticateUser: RequestHandler
): Router => {
    const router = Router()

    router.post('/blood-pressure', authenticateUser, createBloodPressureRecord)
    router.put('/blood-pressure/:id', authenticateUser, updateBloodPressureRecord)
    router.get('/blood-pressure/:id', authenticateUser, getBloodPressureRecord)
    router.get('/blood-pressure', authenticateUser, getBloodPressureRecords)
    router.post('/blood-sugar', authenticateUser, createBloodSugarRecord)
    router.put('/blood-sugar/:id', authenticateUser, updateBloodSugarRecord)
    router.get('/blood-sugar/:id', authenticateUser, getBloodSugarRecord)
    router.get('/blood-sugar', authenticateUser, getBloodSugarRecords)
    router.post('/body-weight', authenticateUser, createBodyWeightRecord)
    router.put('/body-weight/:id', authenticateUser, updateBodyWeightRecord)
    router.get('/body-weight/:id', authenticateUser, getBodyWeightRecord)
    router.get('/body-weight', authenticateUser, getBodyWeightRecords)
    router.post('/illness', authenticateUser, createIllnessRecord)
    router.get('/illness', authenticateUser, getIllnessRecords)
    router.get('/illness/:id', authenticateUser, getIllnessRecord)
    router.put('/illness/:id', authenticateUser, updateIllnessRecord)
    router.delete('/illness/:id', authenticateUser, deleteIllnessRecord)

    return router
}

export default makeVitalsRouter
