import prisma from '../../lib/prisma'
import { Request, Response } from 'express'
import type { Express } from 'express'
import { uploadImageToStorage } from '../services/blobStorage'

const ensureUser = (req: any, res: Response) => {
    if (!req.user) {
        res.status(401).json({
            status: 401,
            message: 'Unauthorized'
        })
        return null
    }
    return req.user
}

export const addVehicle = async(req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return

    const {
        make,
        model,
        year,
        color,
        licensePlate,
        registrationExpiryDate,
        vin,
        vehicleType = 'CAR',
        purchaseDate,
        currentMileage,
        imageUrl,
        notes
    } = req.body || {}
    const uploadedImage = (req as any).file as Express.Multer.File | undefined

    if (!make || !model) {
        return res.status(400).json({
            status: 400,
            message: 'make and model are required'
        })
    }

    let resolvedImageUrl = imageUrl || null

    if (uploadedImage) {
        try {
            const upload = await uploadImageToStorage(uploadedImage, 'vehicles')
            resolvedImageUrl = upload.url
        } catch (error: any) {
            const message = error?.message || 'Unable to upload vehicle image'
            return res.status(500).json({ status: 500, message })
        }
    }

    try {
        const vehicle = await prisma.vehicle.create({
            data: {
                userId: user.id,
                make,
                model,
                year: year ? Number(year) : null,
                color: color || null,
                licensePlate: licensePlate || null,
                registrationExpiryDate: registrationExpiryDate ? new Date(registrationExpiryDate) : null,
                vin: vin || null,
                vehicleType,
                purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
                currentMileage: currentMileage ? Number(currentMileage) : null,
                imageUrl: resolvedImageUrl,
                notes: notes || null
            }
        })

        return res.status(201).json({
            status: 201,
            vehicle
        })
    } catch (error: any) {
        const message = error?.message || 'Unable to create vehicle'
        return res.status(500).json({
            status: 500,
            message
        })
    }
}

export const updateMaintenanceRecord = async(req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return
    const { id } = req.params
    if (!id) return res.status(400).json({ status: 400, message: 'record id is required' })

    const {
        vehicleId,
        maintenanceType,
        title,
        description,
        serviceDate,
        mileageAtService,
        servicedBy,
        location,
        cost,
        currency,
        partsUsed,
        laborHours,
        receiptUrl,
        tags,
        nextServiceDue,
        nextServiceMileage
    } = req.body || {}

    try {
        const existing = await prisma.maintenanceRecord.findFirst({
            where: { id, vehicle: { userId: user.id } }
        })
        if (!existing) {
            return res.status(404).json({ status: 404, message: 'Maintenance record not found' })
        }
        const normalizeType = (raw: any) => {
            if (raw === undefined || raw === null) return existing.maintenanceType
            const str = String(raw).trim()
            return str || existing.maintenanceType
        }
        const record = await prisma.maintenanceRecord.update({
            where: { id },
            data: {
                vehicleId: vehicleId || existing.vehicleId,
                maintenanceType: normalizeType(maintenanceType),
                title: title || normalizeType(maintenanceType),
                description: description ?? existing.description,
                serviceDate: serviceDate ? new Date(serviceDate) : existing.serviceDate,
                mileageAtService: mileageAtService !== undefined ? Number(mileageAtService) : existing.mileageAtService,
                servicedBy: servicedBy ?? existing.servicedBy,
                location: location ?? existing.location,
                cost: cost !== undefined ? Number(cost) : existing.cost,
                currency: currency || existing.currency,
                partsUsed: partsUsed ?? existing.partsUsed,
                laborHours: laborHours !== undefined ? Number(laborHours) : existing.laborHours,
                receiptUrl: receiptUrl ?? existing.receiptUrl,
                tags: Array.isArray(tags) ? tags : existing.tags,
                nextServiceDue: nextServiceDue ? new Date(nextServiceDue) : existing.nextServiceDue,
                nextServiceMileage: nextServiceMileage !== undefined ? Number(nextServiceMileage) : existing.nextServiceMileage
            }
        })
        return res.status(200).json({ status: 200, record })
    } catch (error: any) {
        return res.status(500).json({
            status: 500,
            message: error?.message || 'Unable to update maintenance record'
        })
    }
}

export const getVehicle = async(req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return
    const { id } = req.params
    try {
        const vehicle = await prisma.vehicle.findFirst({
            where: {
                id,
                userId: user.id
            }
        })
        if (!vehicle) {
            return res.status(404).json({
                status: 404,
                message: 'Vehicle not found'
            })
        }
        return res.status(200).json({
            status: 200,
            vehicle
        })
    } catch (error: any) {
        return res.status(500).json({
            status: 500,
            message: error?.message || 'Unable to fetch vehicle'
        })
    }
}

export const updateVehicle = async(req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return
    const { id } = req.params
    const {
        make,
        model,
        year,
        color,
        licensePlate,
        registrationExpiryDate,
        vin,
        vehicleType = 'CAR',
        purchaseDate,
        currentMileage,
        imageUrl,
        notes
    } = req.body || {}
    const uploadedImage = (req as any).file as Express.Multer.File | undefined

    try {
        const existing = await prisma.vehicle.findFirst({
            where: { id, userId: user.id }
        })
        if (!existing) {
            return res.status(404).json({
                status: 404,
                message: 'Vehicle not found'
            })
        }
        let resolvedImageUrl = imageUrl || existing.imageUrl || null

        if (uploadedImage) {
            const upload = await uploadImageToStorage(uploadedImage, 'vehicles')
            resolvedImageUrl = upload.url
        }

        const vehicle = await prisma.vehicle.update({
            where: { id },
            data: {
                make: make ?? existing.make,
                model: model ?? existing.model,
                year: year !== undefined ? Number(year) : existing.year,
                color: color ?? existing.color,
                licensePlate: licensePlate ?? existing.licensePlate,
                registrationExpiryDate: registrationExpiryDate ? new Date(registrationExpiryDate) : existing.registrationExpiryDate,
                vin: vin ?? existing.vin,
                vehicleType: vehicleType || existing.vehicleType,
                purchaseDate: purchaseDate ? new Date(purchaseDate) : existing.purchaseDate,
                currentMileage: currentMileage !== undefined && currentMileage !== null
                    ? Number(currentMileage)
                    : existing.currentMileage,
                imageUrl: resolvedImageUrl,
                notes: notes ?? existing.notes
            }
        })
        return res.status(200).json({
            status: 200,
            vehicle
        })
    } catch (error: any) {
        return res.status(500).json({
            status: 500,
            message: error?.message || 'Unable to update vehicle'
        })
    }
}

export const deleteVehicle = async(req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return
    const { id } = req.params
    try {
        const existing = await prisma.vehicle.findFirst({
            where: { id, userId: user.id }
        })
        if (!existing) {
            return res.status(404).json({ status: 404, message: 'Vehicle not found' })
        }
        await prisma.vehicle.delete({ where: { id } })
        return res.status(200).json({ status: 200, deleted: true })
    } catch (error: any) {
        return res.status(500).json({
            status: 500,
            message: error?.message || 'Unable to delete vehicle'
        })
    }
}

export const listVehicles = async(req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return

    try {
        const vehicles = await prisma.vehicle.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
        })
        return res.status(200).json({
            status: 200,
            vehicles
        })
    } catch (error: any) {
        return res.status(500).json({
            status: 500,
            message: error?.message || 'Unable to fetch vehicles'
        })
    }
}

export const listMaintenanceRecords = async(req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return

    const vehicleId = req.query.vehicleId as string | undefined
    const search = (req.query.search as string | undefined)?.trim()

    try {
        const ownedVehicles = await prisma.vehicle.findMany({
            where: { userId: user.id },
            select: { id: true }
        })
        const ownedIds = ownedVehicles.map(v => v.id)
        if (vehicleId && !ownedIds.includes(vehicleId)) {
            return res.status(404).json({
                status: 404,
                message: 'Vehicle not found for current user'
            })
        }
        const filterIds = vehicleId ? [vehicleId] : ownedIds
        const records = await prisma.maintenanceRecord.findMany({
            where: {
                vehicleId: { in: filterIds },
                ...(search
                    ? {
                        OR: [
                            { maintenanceType: { contains: search, mode: 'insensitive' } },
                            { title: { contains: search, mode: 'insensitive' } },
                            { description: { contains: search, mode: 'insensitive' } }
                        ]
                    }
                    : {})
            },
            orderBy: { serviceDate: 'desc' }
        })

        return res.status(200).json({
            status: 200,
            records
        })
    } catch (error: any) {
        console.error('listMaintenanceRecords error', error)
        return res.status(500).json({
            status: 500,
            message: error?.message || 'Unable to fetch maintenance records'
        })
    }
}

export const addMaintenanceRecord = async(req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return

    const {
        vehicleId,
        maintenanceType = 'OTHER',
        title,
        description,
        serviceDate,
        mileageAtService,
        servicedBy,
        location,
        cost,
        currency = 'USD',
        partsUsed,
        laborHours,
        receiptUrl,
        tags
    } = req.body || {}

    const normalizedTitle = title || maintenanceType || 'Maintenance'
    if (!vehicleId || !normalizedTitle || !serviceDate) {
        return res.status(400).json({
            status: 400,
            message: 'vehicleId, maintenanceType/title, and serviceDate are required'
        })
    }

    const vehicle = await prisma.vehicle.findFirst({
        where: {
            id: vehicleId,
            userId: user.id
        }
    })

    if (!vehicle) {
        return res.status(404).json({
            status: 404,
            message: 'Vehicle not found for current user'
        })
    }

    const normalizeType = (raw: any) => {
        if (!raw) return 'OTHER'
        const str = String(raw).trim()
        return str || 'OTHER'
    }

    try {
        const record = await prisma.maintenanceRecord.create({
            data: {
                vehicleId,
                maintenanceType: normalizeType(maintenanceType),
                title: normalizedTitle,
                description: description || null,
                serviceDate: new Date(serviceDate),
                mileageAtService: mileageAtService ? Number(mileageAtService) : null,
                servicedBy: servicedBy || null,
                location: location || null,
                cost: cost !== undefined && cost !== null ? Number(cost) : null,
                currency: currency || 'USD',
                partsUsed: partsUsed || null,
                laborHours: laborHours ? Number(laborHours) : null,
                receiptUrl: receiptUrl || null,
                tags: Array.isArray(tags) ? tags : []
            }
        })

        return res.status(201).json({
            status: 201,
            record
        })
    } catch (error: any) {
        const message = error?.message || 'Unable to create maintenance record'
        return res.status(500).json({
            status: 500,
            message
        })
    }
}

export const getMaintenanceRecord = async(req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return
    const { id } = req.params
    try {
        const record = await prisma.maintenanceRecord.findFirst({
            where: {
                id,
                vehicle: {
                    userId: user.id
                }
            },
            include: {
                vehicle: true
            }
        })
        if (!record) {
            return res.status(404).json({
                status: 404,
                message: 'Maintenance record not found'
            })
        }
        return res.status(200).json({
            status: 200,
            record
        })
    } catch (error: any) {
        return res.status(500).json({
            status: 500,
            message: error?.message || 'Unable to fetch maintenance record'
        })
    }
}

export const deleteMaintenanceRecord = async(req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return
    const { id } = req.params
    try {
        const record = await prisma.maintenanceRecord.findFirst({
            where: {
                id,
                vehicle: {
                    userId: user.id
                }
            }
        })
        if (!record) {
            return res.status(404).json({
                status: 404,
                message: 'Maintenance record not found'
            })
        }
        await prisma.maintenanceRecord.delete({
            where: { id }
        })
        return res.status(200).json({
            status: 200,
            message: 'Maintenance record deleted'
        })
    } catch (error: any) {
        return res.status(500).json({
            status: 500,
            message: error?.message || 'Unable to delete maintenance record'
        })
    }
}

export const listReminders = async(req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return
    const vehicleId = req.query.vehicleId as string | undefined

    try {
        const ownedVehicles = await prisma.vehicle.findMany({
            where: { userId: user.id },
            select: { id: true }
        })
        const ownedIds = ownedVehicles.map(v => v.id)
        if (!ownedIds.length) {
            return res.status(200).json({ status: 200, reminders: [] })
        }
        const reminders = await prisma.vehicleReminder.findMany({
            where: {
                vehicleId: vehicleId ? vehicleId : { in: ownedIds },
                vehicle: { userId: user.id }
            },
            orderBy: [
                { dueDate: 'asc' },
                { createdAt: 'desc' }
            ]
        })
        return res.status(200).json({
            status: 200,
            reminders
        })
    } catch (error: any) {
        return res.status(500).json({
            status: 500,
            message: error?.message || 'Unable to fetch reminders'
        })
    }
}

export const addReminder = async(req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return
    const {
        vehicleId,
        maintenanceType,
        title,
        description,
        dueDate,
        dueMileage,
        notifyInAdvance
    } = req.body || {}

    if (!vehicleId) {
        return res.status(400).json({ status: 400, message: 'vehicleId is required' })
    }
    if (!maintenanceType && !title) {
        return res.status(400).json({ status: 400, message: 'maintenanceType is required' })
    }

    try {
        const vehicle = await prisma.vehicle.findFirst({
            where: { id: vehicleId, userId: user.id }
        })
        if (!vehicle) {
            return res.status(404).json({ status: 404, message: 'Vehicle not found' })
        }

        const reminder = await prisma.vehicleReminder.create({
            data: {
                vehicleId,
                maintenanceType: maintenanceType || title,
                title: title || maintenanceType,
                description: description || null,
                dueDate: dueDate ? new Date(dueDate) : null,
                dueMileage: dueMileage ? Number(dueMileage) : null,
                notifyInAdvance: notifyInAdvance ? Number(notifyInAdvance) : null
            }
        })

        return res.status(201).json({
            status: 201,
            reminder
        })
    } catch (error: any) {
        return res.status(500).json({
            status: 500,
            message: error?.message || 'Unable to create reminder'
        })
    }
}

export const updateReminder = async(req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return
    const { id } = req.params
    const {
        maintenanceType,
        title,
        description,
        dueDate,
        dueMileage,
        notifyInAdvance,
        completed,
        active
    } = req.body || {}

    try {
        const existing = await prisma.vehicleReminder.findFirst({
            where: {
                id,
                vehicle: { userId: user.id }
            }
        })
        if (!existing) {
            return res.status(404).json({ status: 404, message: 'Reminder not found' })
        }

        const updateData: any = {}
        if (maintenanceType !== undefined) updateData.maintenanceType = maintenanceType
        if (title !== undefined) updateData.title = title
        if (description !== undefined) updateData.description = description
        if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
        if (dueMileage !== undefined) updateData.dueMileage = dueMileage ? Number(dueMileage) : null
        if (notifyInAdvance !== undefined) updateData.notifyInAdvance = notifyInAdvance ? Number(notifyInAdvance) : null
        if (active !== undefined) updateData.active = Boolean(active)
        if (completed !== undefined) {
            const completedVal = completed === true || completed === 'true' || completed === 1 || completed === '1'
            updateData.completed = completedVal
            updateData.completedAt = completedVal ? new Date() : null
        }

        const reminder = await prisma.vehicleReminder.update({
            where: { id },
            data: updateData
        })

        return res.status(200).json({
            status: 200,
            reminder
        })
    } catch (error: any) {
        return res.status(500).json({
            status: 500,
            message: error?.message || 'Unable to update reminder'
        })
    }
}

export const getReminder = async(req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return
    const { id } = req.params
    try {
        const reminder = await prisma.vehicleReminder.findFirst({
            where: { id, vehicle: { userId: user.id } },
            include: { vehicle: true }
        })
        if (!reminder) {
            return res.status(404).json({ status: 404, message: 'Reminder not found' })
        }
        return res.status(200).json({ status: 200, reminder })
    } catch (error: any) {
        return res.status(500).json({
            status: 500,
            message: error?.message || 'Unable to fetch reminder'
        })
    }
}

export const deleteReminder = async(req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return
    const { id } = req.params
    try {
        const existing = await prisma.vehicleReminder.findFirst({
            where: { id, vehicle: { userId: user.id } }
        })
        if (!existing) {
            return res.status(404).json({ status: 404, message: 'Reminder not found' })
        }
        await prisma.vehicleReminder.delete({ where: { id } })
        return res.status(200).json({ status: 200, deleted: true })
    } catch (error: any) {
        return res.status(500).json({
            status: 500,
            message: error?.message || 'Unable to delete reminder'
        })
    }
}
export const getPreferences = async(req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return
    try {
        const prefs = await prisma.userPreference.findUnique({
            where: { userId: user.id }
        })
        return res.status(200).json({
            status: 200,
            preferences: prefs || {
                distanceUnit: 'km',
                currency: 'USD',
                maintenanceTypes: []
            }
        })
    } catch (error: any) {
        return res.status(500).json({
            status: 500,
            message: error?.message || 'Unable to load preferences'
        })
    }
}

export const savePreferences = async(req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return
    const {
        distanceUnit = 'km',
        currency = 'USD',
        maintenanceTypes = []
    } = req.body || {}

    try {
        const prefs = await prisma.userPreference.upsert({
            where: { userId: user.id },
            update: {
                distanceUnit,
                currency,
                maintenanceTypes
            },
            create: {
                userId: user.id,
                distanceUnit,
                currency,
                maintenanceTypes
            }
        })
        return res.status(200).json({
            status: 200,
            preferences: prefs
        })
    } catch (error: any) {
        return res.status(500).json({
            status: 500,
            message: error?.message || 'Unable to save preferences'
        })
    }
}
