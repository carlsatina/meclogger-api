import { RequestHandler, Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { createFamilyMember, listProfiles } from '../controller/profileController'

const makeProfileRouter = (
    _dbClient: PrismaClient,
    authenticateUser: RequestHandler
): Router => {
    const router = Router()

    router.get('/', authenticateUser, listProfiles)
    router.post('/', authenticateUser, createFamilyMember)

    return router
}

export default makeProfileRouter
