import { RequestHandler, Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { addVehicle, addMaintenanceRecord, listVehicles, listMaintenanceRecords, getVehicle, updateVehicle, deleteVehicle, getMaintenanceRecord, deleteMaintenanceRecord, addReminder, listReminders, updateReminder, getReminder, deleteReminder, getPreferences, savePreferences, updateMaintenanceRecord } from '../controller/carMaintenanceController'
import uploadVehicleImage from '../middlewares/uploadVehicleImage'

const makeCarMaintenanceRouter = (
    _dbClient: PrismaClient,
    authenticateUser: RequestHandler
): Router => {
    const router = Router()

    router.get('/vehicles', authenticateUser, listVehicles)
    router.get('/vehicles/:id', authenticateUser, getVehicle)
    router.post('/vehicles', authenticateUser, uploadVehicleImage.single('image'), addVehicle)
    router.put('/vehicles/:id', authenticateUser, uploadVehicleImage.single('image'), updateVehicle)
    router.delete('/vehicles/:id', authenticateUser, deleteVehicle)
    router.get('/maintenance-records', authenticateUser, listMaintenanceRecords)
    router.post('/maintenance-records', authenticateUser, addMaintenanceRecord)
    router.put('/maintenance-records/:id', authenticateUser, updateMaintenanceRecord)
    router.get('/maintenance-records/:id', authenticateUser, getMaintenanceRecord)
    router.delete('/maintenance-records/:id', authenticateUser, deleteMaintenanceRecord)
    router.get('/preferences', authenticateUser, getPreferences)
    router.post('/preferences', authenticateUser, savePreferences)
    router.get('/reminders', authenticateUser, listReminders)
    router.post('/reminders', authenticateUser, addReminder)
    router.put('/reminders/:id', authenticateUser, updateReminder)
    router.get('/reminders/:id', authenticateUser, getReminder)
    router.delete('/reminders/:id', authenticateUser, deleteReminder)

    return router
}

export default makeCarMaintenanceRouter
