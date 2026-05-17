import { Request, Response } from 'express'
import prisma from '../../lib/prisma'

export const createLabResult = async (req: Request, res: Response) => {
    const user = (req as any).user
    if (!user?.id) return res.status(401).json({ status: 401, message: 'Unauthorized' })

    const { profileId, testName, value, unit, referenceRange, status, collectedAt, labName, notes } = req.body || {}

    if (!profileId || !testName || value === undefined || value === null) {
        return res.status(400).json({ status: 400, message: 'profileId, testName, and value are required' })
    }

    const profile = await prisma.profile.findFirst({ where: { id: profileId, userId: user.id } })
    if (!profile) return res.status(404).json({ status: 404, message: 'Profile not found' })

    const labResult = await prisma.labResult.create({
        data: {
            profileId,
            testName,
            value: String(value),
            unit: unit || null,
            referenceRange: referenceRange || null,
            status: status || 'UNKNOWN',
            collectedAt: collectedAt ? new Date(collectedAt) : null,
            labName: labName || null,
            notes: notes || null
        }
    })

    return res.status(201).json({ status: 201, labResult })
}

export const listLabResults = async (req: Request, res: Response) => {
    const user = (req as any).user
    if (!user?.id) return res.status(401).json({ status: 401, message: 'Unauthorized' })

    const profileId = req.query.profileId as string
    if (!profileId) return res.status(400).json({ status: 400, message: 'profileId is required' })

    const profile = await prisma.profile.findFirst({ where: { id: profileId, userId: user.id } })
    if (!profile) return res.status(404).json({ status: 404, message: 'Profile not found' })

    const labResults = await prisma.labResult.findMany({
        where: { profileId },
        orderBy: { collectedAt: 'desc' }
    })

    return res.status(200).json({ status: 200, labResults })
}

export const deleteLabResult = async (req: Request, res: Response) => {
    const user = (req as any).user
    if (!user?.id) return res.status(401).json({ status: 401, message: 'Unauthorized' })

    const labResult = await prisma.labResult.findFirst({
        where: { id: req.params.id, profile: { userId: user.id } }
    })
    if (!labResult) return res.status(404).json({ status: 404, message: 'Lab result not found' })

    await prisma.labResult.delete({ where: { id: req.params.id } })
    return res.status(200).json({ status: 200, message: 'Deleted' })
}
