import { RequestHandler, Router } from 'express'
import { PrismaClient } from '@prisma/client'
import {
    listMedicalRecords,
    getMedicalRecord,
    createMedicalRecord,
    updateMedicalRecord,
    deleteMedicalRecord
} from '../controller/medicalRecordController'
import uploadMedicalRecordFiles from '../middlewares/uploadMedicalRecords'

const makeMedicalRecordsRouter = (
    _dbClient: PrismaClient,
    authenticateUser: RequestHandler
): Router => {
    const router = Router()

    router.get('/', authenticateUser, listMedicalRecords)
    router.get('/:id', authenticateUser, getMedicalRecord)
    router.post(
        '/',
        authenticateUser,
        uploadMedicalRecordFiles.array('files', 5),
        createMedicalRecord
    )
    router.put(
        '/:id',
        authenticateUser,
        uploadMedicalRecordFiles.array('files', 5),
        updateMedicalRecord
    )
    router.delete('/:id', authenticateUser, deleteMedicalRecord)

    return router
}

export default makeMedicalRecordsRouter
