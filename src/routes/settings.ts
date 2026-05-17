import { RequestHandler, Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { getSettings, updateSettings } from '../controller/settingsController'

const makeSettingsRouter = (
    _dbClient: PrismaClient,
    authenticateUser: RequestHandler
): Router => {
    const router = Router()
    router.get('/',  authenticateUser, getSettings)
    router.put('/',  authenticateUser, updateSettings)
    return router
}

export default makeSettingsRouter
