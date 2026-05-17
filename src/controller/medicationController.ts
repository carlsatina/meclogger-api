import { Request, Response } from 'express'
import prisma from '../../lib/prisma'

function ensureUser(req: Request, res: Response): any {
    const user = (req as any).user
    if (!user?.id) {
        res.status(401).json({ status: 401, message: 'Unauthorized' })
        return null
    }
    return user
}

export const createMedication = async (req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return

    const { profileId, name, dosage, instructions, startDate } = req.body || {}
    if (!profileId || !name) {
        return res.status(400).json({ status: 400, message: 'profileId and name are required' })
    }

    const profile = await prisma.profile.findFirst({ where: { id: profileId, userId: user.id } })
    if (!profile) {
        return res.status(404).json({ status: 404, message: 'Profile not found' })
    }

    try {
        const medication = await prisma.medication.create({
            data: {
                profileId,
                name,
                dosage: dosage || null,
                instructions: instructions || null,
                startDate: startDate ? new Date(startDate) : null
            }
        })
        return res.status(201).json({ status: 201, medication })
    } catch (error: any) {
        return res.status(500).json({ status: 500, message: error?.message || 'Unable to create medication' })
    }
}

export const listMedications = async (req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return

    const profileId = req.query.profileId as string
    if (!profileId) {
        return res.status(400).json({ status: 400, message: 'profileId is required' })
    }

    const profile = await prisma.profile.findFirst({ where: { id: profileId, userId: user.id } })
    if (!profile) {
        return res.status(404).json({ status: 404, message: 'Profile not found' })
    }

    try {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const medications = await prisma.medication.findMany({
            where: { profileId },
            orderBy: { createdAt: 'desc' },
            include: {
                logs: {
                    where: { occurredAt: { gte: since } },
                    orderBy: { occurredAt: 'desc' }
                }
            }
        })
        return res.status(200).json({ status: 200, medications })
    } catch (error: any) {
        return res.status(500).json({ status: 500, message: error?.message || 'Unable to fetch medications' })
    }
}

export const updateMedication = async (req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return

    const medication = await prisma.medication.findFirst({
        where: { id: req.params.id, profile: { userId: user.id } }
    })
    if (!medication) return res.status(404).json({ status: 404, message: 'Medication not found' })

    const { name, dosage, instructions } = req.body || {}
    const data: any = {}
    if (name !== undefined) data.name = name
    if (dosage !== undefined) data.dosage = dosage
    if (instructions !== undefined) data.instructions = instructions

    try {
        const updated = await prisma.medication.update({ where: { id: req.params.id }, data })
        return res.status(200).json({ status: 200, medication: updated })
    } catch (error: any) {
        return res.status(500).json({ status: 500, message: error?.message || 'Unable to update medication' })
    }
}

export const deleteMedication = async (req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return

    const medication = await prisma.medication.findFirst({
        where: { id: req.params.id, profile: { userId: user.id } }
    })
    if (!medication) return res.status(404).json({ status: 404, message: 'Medication not found' })

    await prisma.medication.delete({ where: { id: req.params.id } })
    return res.status(200).json({ status: 200, message: 'Deleted' })
}

export const logDose = async (req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return

    const medicationId = req.params.id
    const { status, occurredAt } = req.body || {}

    if (!['taken', 'skipped', 'missed'].includes(status)) {
        return res.status(400).json({ status: 400, message: 'status must be taken, skipped, or missed' })
    }

    const medication = await prisma.medication.findFirst({
        where: { id: medicationId, profile: { userId: user.id } }
    })
    if (!medication) return res.status(404).json({ status: 404, message: 'Medication not found' })

    const logTime = occurredAt ? new Date(occurredAt) : new Date()

    try {
        const log = await prisma.medicationLog.create({
            data: { medicationId, occurredAt: logTime, status }
        })
        return res.status(201).json({ status: 201, log })
    } catch (error: any) {
        return res.status(500).json({ status: 500, message: error?.message || 'Unable to log dose' })
    }
}
