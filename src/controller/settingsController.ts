import { Request, Response } from 'express'
import prisma from '../../lib/prisma'

export const getSettings = async (req: Request, res: Response) => {
    const user = (req as any).user
    if (!user?.id) return res.status(401).json({ status: 401, message: 'Unauthorized' })

    const prefs = await prisma.userPreference.findUnique({ where: { userId: user.id } })
    return res.status(200).json({
        status: 200,
        settings: {
            aiProvider: prefs?.aiProvider || '',
            aiApiKeySet: !!(prefs?.aiApiKey),
            distanceUnit: prefs?.distanceUnit || 'km',
            currency: prefs?.currency || 'PHP',
        }
    })
}

export const updateSettings = async (req: Request, res: Response) => {
    const user = (req as any).user
    if (!user?.id) return res.status(401).json({ status: 401, message: 'Unauthorized' })

    const { aiProvider, aiApiKey, distanceUnit, currency } = req.body

    const prefs = await prisma.userPreference.upsert({
        where: { userId: user.id },
        update: {
            ...(aiProvider !== undefined && { aiProvider }),
            ...(aiApiKey  !== undefined && { aiApiKey }),
            ...(distanceUnit !== undefined && { distanceUnit }),
            ...(currency !== undefined && { currency }),
        },
        create: {
            userId: user.id,
            aiProvider: aiProvider || '',
            aiApiKey:   aiApiKey  || '',
            distanceUnit: distanceUnit || 'km',
            currency: currency || 'PHP',
            maintenanceTypes: [],
        }
    })

    return res.status(200).json({
        status: 200,
        settings: {
            aiProvider: prefs.aiProvider,
            aiApiKey: prefs.aiApiKey,
            distanceUnit: prefs.distanceUnit,
            currency: prefs.currency,
        }
    })
}
