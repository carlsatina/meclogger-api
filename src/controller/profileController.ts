import prisma from '../../lib/prisma'
import { ExtendedRequest } from '../../extendedRequest'

const ensureUser = (req: ExtendedRequest, res: any) => {
    if (!req.user) {
        res.status(401).json({
            status: 401,
            message: 'Unauthorized'
        })
        return null
    }
    return req.user
}

const createFamilyMember = async (req: ExtendedRequest, res: any) => {
    const user = ensureUser(req, res)
    if (!user) return

    const {
        displayName,
        relationToUser,
        dateOfBirth,
        gender,
        bloodGroup,
        allergies,
        chronicConditions
    } = req.body

    if (!displayName || typeof displayName !== 'string') {
        return res.status(400).json({
            status: 400,
            message: 'displayName is required.'
        })
    }

    try {
        const profile = await prisma.profile.create({
            data: {
                userId: user.id,
                displayName,
                relationToUser,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                gender,
                bloodGroup,
                allergies,
                chronicConditions
            },
            include: {
                records: true,
                vitals: true
            }
        })

        return res.status(201).json({
            status: 201,
            profile
        })
    } catch (error: any) {
        console.error('createFamilyMember error', error)
        return res.status(500).json({
            status: 500,
            message: 'Unable to create family member profile.',
            error: error.message
        })
    }
}
const listProfiles = async (req: ExtendedRequest, res: any) => {
    const user = ensureUser(req, res)
    if (!user) return

    try {
        const profiles = await prisma.profile.findMany({
            where: {
                userId: user.id
            },
            include: {
                records: true,
                vitals: true
            },
            orderBy: {
                createdAt: 'asc'
            }
        })
        return res.status(200).json({
            status: 200,
            profiles
        })
    } catch (error: any) {
        console.error('listProfiles error', error)
        return res.status(500).json({
            status: 500,
            message: 'Unable to fetch profiles.',
            error: error.message
        })
    }
}

export {
    createFamilyMember,
    listProfiles
}
