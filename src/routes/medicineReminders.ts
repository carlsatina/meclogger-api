import { RequestHandler, Router } from 'express'
import { PrismaClient } from '@prisma/client'
import {
    listMedicineReminders,
    getMedicineReminder,
    createMedicineReminder,
    updateMedicineReminder,
    deleteMedicineReminder,
    setMedicineReminderStatus
} from '../controller/medicineReminderController'

const makeMedicineReminderRouter = (
    _dbClient: PrismaClient,
    authenticateUser: RequestHandler
): Router => {
    const router = Router()

    router.get('/', authenticateUser, listMedicineReminders)
    router.get('/:id', authenticateUser, getMedicineReminder)
    router.post('/', authenticateUser, createMedicineReminder)
    router.put('/:id', authenticateUser, updateMedicineReminder)
    router.post('/:id/logs', authenticateUser, setMedicineReminderStatus)
    router.delete('/:id', authenticateUser, deleteMedicineReminder)

    return router
}

export default makeMedicineReminderRouter
