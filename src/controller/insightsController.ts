import { Request, Response } from 'express'
import prisma from '../../lib/prisma'
import { generateHealthInsights, extractPrescription, extractLabReport, HealthInsightInput } from '../services/aiService'

function ensureUser(req: Request, res: Response): any {
    const user = (req as any).user
    if (!user?.id) {
        res.status(401).json({ status: 401, message: 'Unauthorized' })
        return null
    }
    return user
}

export const getHealthInsights = async (req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return

    const profileId = req.query.profileId as string
    const days = Math.min(parseInt(req.query.days as string) || 30, 90)

    if (!profileId) {
        return res.status(400).json({ status: 400, message: 'profileId is required' })
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

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

    const [profile, vitals, medications, illnesses] = await Promise.all([
        prisma.profile.findFirst({
            where: { id: profileId, userId: user.id }
        }),
        prisma.vitalEntry.findMany({
            where: { profileId, recordedAt: { gte: since } },
            orderBy: { recordedAt: 'asc' }
        }),
        prisma.medication.findMany({
            where: { profileId },
            include: {
                logs: { where: { occurredAt: { gte: since } } }
            }
        }),
        prisma.illnessEntry.findMany({
            where: { profileId, recordedAt: { gte: since90 } },
            orderBy: { recordedAt: 'desc' }
        })
    ])

    if (!profile) {
        return res.status(404).json({ status: 404, message: 'Profile not found' })
    }

    const medicationsWithAdherence = medications.map(med => {
        const total = med.logs.length
        const taken = med.logs.filter(l => l.status === 'TAKEN').length
        const adherencePercent = total > 0 ? Math.round((taken / total) * 100) : 0
        return {
            name: med.name,
            dosage: med.dosage,
            inventoryQuantity: med.inventoryQuantity,
            lowStockThreshold: med.lowStockThreshold,
            adherencePercent,
            totalLogs: total,
            takenLogs: taken
        }
    })

    const data: HealthInsightInput = {
        profile: {
            displayName: profile.displayName,
            dateOfBirth: profile.dateOfBirth?.toISOString(),
            gender: profile.gender,
            bloodGroup: profile.bloodGroup,
            allergies: profile.allergies,
            chronicConditions: profile.chronicConditions
        },
        vitals: vitals.map(v => ({
            vitalType: v.vitalType,
            valueNumber: v.valueNumber,
            systolic: v.systolic,
            diastolic: v.diastolic,
            unit: v.unit,
            recordedAt: v.recordedAt.toISOString(),
            notes: v.notes
        })),
        medications: medicationsWithAdherence,
        illnesses: illnesses.map(i => ({
            diagnosis: i.diagnosis,
            severity: i.severity,
            status: i.status,
            symptoms: i.symptoms,
            recordedAt: i.recordedAt.toISOString()
        })),
        days
    }

    try {
        const insights = await generateHealthInsights(aiProvider, aiApiKey, data)
        return res.status(200).json({ status: 200, insights })
    } catch (error: any) {
        const message = error?.message || 'AI service error'
        const isKeyError = message.toLowerCase().includes('api key') ||
            message.toLowerCase().includes('authentication') ||
            message.toLowerCase().includes('unauthorized') ||
            message.toLowerCase().includes('invalid')
        return res.status(isKeyError ? 401 : 500).json({
            status: isKeyError ? 401 : 500,
            message: isKeyError ? 'Invalid API key. Check your AI settings.' : message
        })
    }
}

export const extractPrescriptionHandler = async (req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return

    const { imageBase64, mimeType } = req.body || {}
    if (!imageBase64 || !mimeType) {
        return res.status(400).json({ status: 400, message: 'imageBase64 and mimeType are required' })
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
        const result = await extractPrescription(aiProvider, aiApiKey, imageBase64, mimeType)
        return res.status(200).json({ status: 200, extract: result })
    } catch (error: any) {
        const message = error?.message || 'AI service error'
        const isKeyError = message.toLowerCase().includes('api key') ||
            message.toLowerCase().includes('authentication') ||
            message.toLowerCase().includes('unauthorized') ||
            message.toLowerCase().includes('invalid')
        return res.status(isKeyError ? 401 : 500).json({
            status: isKeyError ? 401 : 500,
            message: isKeyError ? 'Invalid API key. Check your AI settings.' : message
        })
    }
}

export const extractLabReportHandler = async (req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return

    const { imageBase64, mimeType } = req.body || {}
    if (!imageBase64 || !mimeType) {
        return res.status(400).json({ status: 400, message: 'imageBase64 and mimeType are required' })
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
        const result = await extractLabReport(aiProvider, aiApiKey, imageBase64, mimeType)
        return res.status(200).json({ status: 200, extract: result })
    } catch (error: any) {
        const message = error?.message || 'AI service error'
        const isKeyError = message.toLowerCase().includes('api key') ||
            message.toLowerCase().includes('authentication') ||
            message.toLowerCase().includes('unauthorized') ||
            message.toLowerCase().includes('invalid')
        return res.status(isKeyError ? 401 : 500).json({
            status: isKeyError ? 401 : 500,
            message: isKeyError ? 'Invalid API key. Check your AI settings.' : message
        })
    }
}
