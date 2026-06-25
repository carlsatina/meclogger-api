import { Request, Response } from 'express'
import prisma from '../../lib/prisma'
import { explainLabResult } from '../services/aiService'

const normalizeTestKey = (name: string) =>
    name.trim().toLowerCase().replace(/\s+/g, ' ')

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

const VALID_STATUSES = ['NORMAL', 'HIGH', 'LOW', 'CRITICAL', 'UNKNOWN']

export const getLabExplanation = async (req: Request, res: Response) => {
    const user = (req as any).user
    if (!user?.id) return res.status(401).json({ status: 401, message: 'Unauthorized' })

    const testName = (req.query.testName as string || '').trim()
    if (!testName) return res.status(400).json({ status: 400, message: 'testName is required' })

    const testKey = normalizeTestKey(testName)

    // Serve from shared cache when available — explanations are general, not per-user.
    const cached = await prisma.labExplanation.findUnique({ where: { testKey } })
    if (cached) {
        return res.status(200).json({ status: 200, explanation: cached.content, cached: true })
    }

    const prefs = await prisma.userPreference.findUnique({ where: { userId: user.id } })
    const aiProvider = prefs?.aiProvider || ''
    const aiApiKey = prefs?.aiApiKey || ''
    if (!aiProvider || !aiApiKey) {
        return res.status(422).json({
            status: 422,
            message: 'AI provider not configured. Go to Settings and add your API key.'
        })
    }

    try {
        const explanation = await explainLabResult(aiProvider, aiApiKey, testName)
        const saved = await prisma.labExplanation.upsert({
            where: { testKey },
            create: { testKey, testName, content: explanation as any },
            update: { content: explanation as any, testName }
        })
        return res.status(200).json({ status: 200, explanation: saved.content, cached: false })
    } catch (err: any) {
        return res.status(502).json({ status: 502, message: err?.message || 'Unable to generate explanation' })
    }
}

export const updateLabResult = async (req: Request, res: Response) => {
    const user = (req as any).user
    if (!user?.id) return res.status(401).json({ status: 401, message: 'Unauthorized' })

    const existing = await prisma.labResult.findFirst({
        where: { id: req.params.id, profile: { userId: user.id } }
    })
    if (!existing) return res.status(404).json({ status: 404, message: 'Lab result not found' })

    const { testName, value, unit, referenceRange, status, collectedAt, labName, notes } = req.body || {}

    if (testName !== undefined && (!testName || !String(testName).trim())) {
        return res.status(400).json({ status: 400, message: 'testName cannot be empty' })
    }
    if (value !== undefined && (value === null || !String(value).trim())) {
        return res.status(400).json({ status: 400, message: 'value cannot be empty' })
    }
    if (status !== undefined && status !== null && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ status: 400, message: 'Invalid status' })
    }

    const data: Record<string, any> = {}
    if (testName !== undefined) data.testName = String(testName).trim()
    if (value !== undefined) data.value = String(value)
    if (unit !== undefined) data.unit = unit || null
    if (referenceRange !== undefined) data.referenceRange = referenceRange || null
    if (status !== undefined) data.status = status || 'UNKNOWN'
    if (collectedAt !== undefined) data.collectedAt = collectedAt ? new Date(collectedAt) : null
    if (labName !== undefined) data.labName = labName || null
    if (notes !== undefined) data.notes = notes || null

    const labResult = await prisma.labResult.update({
        where: { id: existing.id },
        data
    })

    return res.status(200).json({ status: 200, labResult })
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
