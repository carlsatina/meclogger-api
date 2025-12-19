import { IllnessSeverity, IllnessStatus, VitalType } from '@prisma/client'
import prisma from '../../lib/prisma'
import { ExtendedRequest } from '../../extendedRequest'

const resolveProfileForUser = async(userId: string, profileId?: string) => {
    if (profileId) {
        return prisma.profile.findFirst({
            where: {
                id: profileId,
                userId
            }
        })
    }

    return prisma.profile.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' }
    })
}

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

const findEntryForUser = async(userId: string, entryId: string) => {
    return prisma.vitalEntry.findFirst({
        where: {
            id: entryId,
            profile: {
                userId
            }
        }
    })
}

const findIllnessForUser = async(userId: string, entryId: string) => {
    return prisma.illnessEntry.findFirst({
        where: {
            id: entryId,
            profile: {
                userId
            }
        }
    })
}

const asIllnessSeverity = (value: unknown): IllnessSeverity | null => {
    if (typeof value !== 'string') return null
    const key = value.toUpperCase() as keyof typeof IllnessSeverity
    return IllnessSeverity[key] || null
}

const asIllnessStatus = (value: unknown): IllnessStatus | null => {
    if (typeof value !== 'string') return null
    const key = value.toUpperCase() as keyof typeof IllnessStatus
    return IllnessStatus[key] || null
}

const createBloodPressureRecord = async (req: ExtendedRequest, res: any) => {
    const user = ensureUser(req, res)
    if (!user) return

    const { profileId, systolic, diastolic, recordedAt, notes } = req.body

    const systolicValue = Number(systolic)
    const diastolicValue = Number(diastolic)

    if (Number.isNaN(systolicValue) || Number.isNaN(diastolicValue)) {
        return res.status(400).json({
            status: 400,
            message: 'Systolic and diastolic values are required and must be numbers.'
        })
    }

    const profile = await resolveProfileForUser(user.id, profileId)
    if (!profile) {
        return res.status(404).json({
            status: 404,
            message: 'Profile not found for current user.'
        })
    }

    const entry = await prisma.vitalEntry.create({
        data: {
            profileId: profile.id,
            vitalType: VitalType.BLOOD_PRESSURE_SYSTOLIC,
            systolic: systolicValue,
            diastolic: diastolicValue,
            unit: 'mmHg',
            recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
            notes
        }
    })

    return res.status(201).json({
        status: 201,
        record: entry
    })
}

const createBloodSugarRecord = async (req: ExtendedRequest, res: any) => {
    const user = ensureUser(req, res)
    if (!user) return

    const { profileId, reading, context, recordedAt, notes } = req.body
    const readingValue = Number(reading)

    if (Number.isNaN(readingValue)) {
        return res.status(400).json({
            status: 400,
            message: 'Blood sugar reading must be provided as a number.'
        })
    }

    const profile = await resolveProfileForUser(user.id, profileId)
    if (!profile) {
        return res.status(404).json({
            status: 404,
            message: 'Profile not found for current user.'
        })
    }

    const entry = await prisma.vitalEntry.create({
        data: {
            profileId: profile.id,
            vitalType: VitalType.BLOOD_GLUCOSE,
            valueNumber: readingValue,
            unit: 'mg/dL',
            chartGroup: context,
            recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
            notes
        }
    })

    return res.status(201).json({
        status: 201,
        record: entry
    })
}

const getBloodPressureRecords = async (req: ExtendedRequest, res: any) => {
    const user = ensureUser(req, res)
    if (!user) return

    const profileId = req.query.profileId as string | undefined

    if (!profileId) {
        return res.status(400).json({
            status: 400,
            message: 'profileId query parameter is required.'
        })
    }

    const profile = await resolveProfileForUser(user.id, profileId)
    if (!profile) {
        return res.status(404).json({
            status: 404,
            message: 'Profile not found for current user.'
        })
    }

    const records = await prisma.vitalEntry.findMany({
        where: {
            profileId: profile.id,
            vitalType: VitalType.BLOOD_PRESSURE_SYSTOLIC
        },
        orderBy: {
            recordedAt: 'asc'
        }
    })

    return res.status(200).json({
        status: 200,
        records
    })
}

const getBloodSugarRecords = async (req: ExtendedRequest, res: any) => {
    const user = ensureUser(req, res)
    if (!user) return

    const profileId = req.query.profileId as string | undefined

    if (!profileId) {
        return res.status(400).json({
            status: 400,
            message: 'profileId query parameter is required.'
        })
    }

    const profile = await resolveProfileForUser(user.id, profileId)
    if (!profile) {
        return res.status(404).json({
            status: 404,
            message: 'Profile not found for current user.'
        })
    }

    const records = await prisma.vitalEntry.findMany({
        where: {
            profileId: profile.id,
            vitalType: VitalType.BLOOD_GLUCOSE
        },
        orderBy: {
            recordedAt: 'asc'
        }
    })

    return res.status(200).json({
        status: 200,
        records
    })
}

const createBodyWeightRecord = async (req: ExtendedRequest, res: any) => {
    const user = ensureUser(req, res)
    if (!user) return

    const { profileId, weight, recordedAt, notes } = req.body
    const weightValue = Number(weight)

    if (Number.isNaN(weightValue)) {
        return res.status(400).json({
            status: 400,
            message: 'Weight must be provided as a number.'
        })
    }

    const profile = await resolveProfileForUser(user.id, profileId)
    if (!profile) {
        return res.status(404).json({
            status: 404,
            message: 'Profile not found for current user.'
        })
    }

    const entry = await prisma.vitalEntry.create({
        data: {
            profileId: profile.id,
            vitalType: VitalType.WEIGHT,
            valueNumber: weightValue,
            unit: 'kg',
            recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
            notes
        }
    })

    return res.status(201).json({
        status: 201,
        record: entry
    })
}

const getBodyWeightRecords = async (req: ExtendedRequest, res: any) => {
    const user = ensureUser(req, res)
    if (!user) return

    const profileId = req.query.profileId as string | undefined

    if (!profileId) {
        return res.status(400).json({
            status: 400,
            message: 'profileId query parameter is required.'
        })
    }

    const profile = await resolveProfileForUser(user.id, profileId)
    if (!profile) {
        return res.status(404).json({
            status: 404,
            message: 'Profile not found for current user.'
        })
    }

    const records = await prisma.vitalEntry.findMany({
        where: {
            profileId: profile.id,
            vitalType: VitalType.WEIGHT
        },
        orderBy: {
            recordedAt: 'asc'
        }
    })

    return res.status(200).json({
        status: 200,
        records
    })
}

const getBloodPressureRecord = async (req: ExtendedRequest, res: any) => {
    const user = ensureUser(req, res)
    if (!user) return

    const entryId = req.params.id
    const entry = await findEntryForUser(user.id, entryId)
    if (!entry || entry.vitalType !== VitalType.BLOOD_PRESSURE_SYSTOLIC) {
        return res.status(404).json({
            status: 404,
            message: 'Blood pressure record not found.'
        })
    }

    res.status(200).json({
        status: 200,
        record: entry
    })
}

const getBloodSugarRecord = async (req: ExtendedRequest, res: any) => {
    const user = ensureUser(req, res)
    if (!user) return

    const entryId = req.params.id
    const entry = await findEntryForUser(user.id, entryId)
    if (!entry || entry.vitalType !== VitalType.BLOOD_GLUCOSE) {
        return res.status(404).json({
            status: 404,
            message: 'Blood sugar record not found.'
        })
    }

    res.status(200).json({
        status: 200,
        record: entry
    })
}

const getBodyWeightRecord = async (req: ExtendedRequest, res: any) => {
    const user = ensureUser(req, res)
    if (!user) return

    const entryId = req.params.id
    const entry = await findEntryForUser(user.id, entryId)
    if (!entry || entry.vitalType !== VitalType.WEIGHT) {
        return res.status(404).json({
            status: 404,
            message: 'Body weight record not found.'
        })
    }

    res.status(200).json({
        status: 200,
        record: entry
    })
}

const updateBloodPressureRecord = async (req: ExtendedRequest, res: any) => {
    const user = ensureUser(req, res)
    if (!user) return

    const entryId = req.params.id
    const existing = await findEntryForUser(user.id, entryId)
    if (!existing || existing.vitalType !== VitalType.BLOOD_PRESSURE_SYSTOLIC) {
        return res.status(404).json({
            status: 404,
            message: 'Blood pressure record not found.'
        })
    }

    const {
        systolic,
        diastolic,
        recordedAt,
        notes
    } = req.body

    const updateData: any = {}
    if (typeof systolic !== 'undefined') {
        const value = Number(systolic)
        if (Number.isNaN(value)) {
            return res.status(400).json({ status: 400, message: 'Systolic must be a number.' })
        }
        updateData.systolic = value
    }
    if (typeof diastolic !== 'undefined') {
        const value = Number(diastolic)
        if (Number.isNaN(value)) {
            return res.status(400).json({ status: 400, message: 'Diastolic must be a number.' })
        }
        updateData.diastolic = value
    }
    if (typeof notes !== 'undefined') {
        updateData.notes = notes
    }
    if (recordedAt) {
        updateData.recordedAt = new Date(recordedAt)
    }

    const updated = await prisma.vitalEntry.update({
        where: { id: entryId },
        data: updateData
    })

    return res.status(200).json({
        status: 200,
        record: updated
    })
}

const updateBloodSugarRecord = async (req: ExtendedRequest, res: any) => {
    const user = ensureUser(req, res)
    if (!user) return

    const entryId = req.params.id
    const existing = await findEntryForUser(user.id, entryId)
    if (!existing || existing.vitalType !== VitalType.BLOOD_GLUCOSE) {
        return res.status(404).json({
            status: 404,
            message: 'Blood sugar record not found.'
        })
    }

    const {
        reading,
        context,
        recordedAt,
        notes
    } = req.body

    const updateData: any = {}
    if (typeof reading !== 'undefined') {
        const value = Number(reading)
        if (Number.isNaN(value)) {
            return res.status(400).json({ status: 400, message: 'Reading must be a number.' })
        }
        updateData.valueNumber = value
    }
    if (typeof context !== 'undefined') {
        updateData.chartGroup = context
    }
    if (typeof notes !== 'undefined') {
        updateData.notes = notes
    }
    if (recordedAt) {
        updateData.recordedAt = new Date(recordedAt)
    }

    const updated = await prisma.vitalEntry.update({
        where: { id: entryId },
        data: updateData
    })

    return res.status(200).json({
        status: 200,
        record: updated
    })
}

const updateBodyWeightRecord = async (req: ExtendedRequest, res: any) => {
    const user = ensureUser(req, res)
    if (!user) return

    const entryId = req.params.id
    const existing = await findEntryForUser(user.id, entryId)
    if (!existing || existing.vitalType !== VitalType.WEIGHT) {
        return res.status(404).json({
            status: 404,
            message: 'Body weight record not found.'
        })
    }

    const {
        weight,
        recordedAt,
        notes
    } = req.body

    const updateData: any = {}
    if (typeof weight !== 'undefined') {
        const value = Number(weight)
        if (Number.isNaN(value)) {
            return res.status(400).json({ status: 400, message: 'Weight must be a number.' })
        }
        updateData.valueNumber = value
    }
    if (typeof notes !== 'undefined') {
        updateData.notes = notes
    }
    if (recordedAt) {
        updateData.recordedAt = new Date(recordedAt)
    }

    const updated = await prisma.vitalEntry.update({
        where: { id: entryId },
        data: updateData
    })

    return res.status(200).json({
        status: 200,
        record: updated
    })
}

const createIllnessRecord = async (req: ExtendedRequest, res: any) => {
    const user = ensureUser(req, res)
    if (!user) return

    const {
        profileId,
        diagnosis,
        symptoms,
        bodyTemperature,
        temperatureUnit,
        severity,
        status,
        notes,
        medications,
        recordedAt
    } = req.body

    if (!diagnosis) {
        return res.status(400).json({
            status: 400,
            message: 'Diagnosis is required.'
        })
    }

    const profile = await resolveProfileForUser(user.id, profileId)
    if (!profile) {
        return res.status(404).json({
            status: 404,
            message: 'Profile not found for current user.'
        })
    }

    const symptomsArray = Array.isArray(symptoms) ? symptoms.filter(Boolean) : []
    const medicationsArray = Array.isArray(medications) ? medications.filter(Boolean) : []
    const tempValue = typeof bodyTemperature !== 'undefined' && bodyTemperature !== null
        ? Number(bodyTemperature)
        : null
    if (tempValue !== null && Number.isNaN(tempValue)) {
        return res.status(400).json({
            status: 400,
            message: 'Body temperature must be a number.'
        })
    }

    const parsedSeverity = asIllnessSeverity(severity)
    const parsedStatus = asIllnessStatus(status)

    const entry = await prisma.illnessEntry.create({
        data: {
            profileId: profile.id,
            diagnosis,
            symptoms: symptomsArray,
            bodyTemperature: tempValue,
            temperatureUnit: temperatureUnit || 'C',
            severity: parsedSeverity || IllnessSeverity.MILD,
            status: parsedStatus || IllnessStatus.ONGOING,
            notes,
            medications: medicationsArray,
            recordedAt: recordedAt ? new Date(recordedAt) : new Date()
        }
    })

    return res.status(201).json({
        status: 201,
        record: entry
    })
}

const getIllnessRecords = async (req: ExtendedRequest, res: any) => {
    const user = ensureUser(req, res)
    if (!user) return

    const profileId = req.query.profileId as string | undefined

    if (!profileId) {
        return res.status(400).json({
            status: 400,
            message: 'profileId query parameter is required.'
        })
    }

    const profile = await resolveProfileForUser(user.id, profileId)
    if (!profile) {
        return res.status(404).json({
            status: 404,
            message: 'Profile not found for current user.'
        })
    }

    const records = await prisma.illnessEntry.findMany({
        where: {
            profileId: profile.id
        },
        orderBy: {
            recordedAt: 'desc'
        }
    })

    return res.status(200).json({
        status: 200,
        records
    })
}

const getIllnessRecord = async (req: ExtendedRequest, res: any) => {
    const user = ensureUser(req, res)
    if (!user) return

    const entryId = req.params.id
    const entry = await findIllnessForUser(user.id, entryId)
    if (!entry) {
        return res.status(404).json({
            status: 404,
            message: 'Illness record not found.'
        })
    }

    return res.status(200).json({
        status: 200,
        record: entry
    })
}

const updateIllnessRecord = async (req: ExtendedRequest, res: any) => {
    const user = ensureUser(req, res)
    if (!user) return

    const entryId = req.params.id
    const existing = await findIllnessForUser(user.id, entryId)
    if (!existing) {
        return res.status(404).json({
            status: 404,
            message: 'Illness record not found.'
        })
    }

    const {
        diagnosis,
        symptoms,
        bodyTemperature,
        temperatureUnit,
        severity,
        status,
        notes,
        medications,
        recordedAt
    } = req.body

    const updateData: any = {}

    if (typeof diagnosis !== 'undefined') {
        updateData.diagnosis = diagnosis
    }

    if (typeof symptoms !== 'undefined') {
        updateData.symptoms = Array.isArray(symptoms) ? symptoms.filter(Boolean) : []
    }

    if (typeof medications !== 'undefined') {
        updateData.medications = Array.isArray(medications) ? medications.filter(Boolean) : []
    }

    if (typeof bodyTemperature !== 'undefined') {
        if (bodyTemperature === null || bodyTemperature === '') {
            updateData.bodyTemperature = null
        } else {
            const value = Number(bodyTemperature)
            if (Number.isNaN(value)) {
                return res.status(400).json({ status: 400, message: 'Body temperature must be a number.' })
            }
            updateData.bodyTemperature = value
        }
    }

    if (typeof temperatureUnit !== 'undefined') {
        updateData.temperatureUnit = temperatureUnit
    }

    if (typeof severity !== 'undefined') {
        const parsed = asIllnessSeverity(severity)
        if (parsed) {
            updateData.severity = parsed
        } else {
            return res.status(400).json({ status: 400, message: 'Invalid severity value.' })
        }
    }

    if (typeof status !== 'undefined') {
        const parsed = asIllnessStatus(status)
        if (parsed) {
            updateData.status = parsed
        } else {
            return res.status(400).json({ status: 400, message: 'Invalid status value.' })
        }
    }

    if (typeof notes !== 'undefined') {
        updateData.notes = notes
    }

    if (recordedAt) {
        updateData.recordedAt = new Date(recordedAt)
    }

    const updated = await prisma.illnessEntry.update({
        where: { id: entryId },
        data: updateData
    })

    return res.status(200).json({
        status: 200,
        record: updated
    })
}

const deleteIllnessRecord = async (req: ExtendedRequest, res: any) => {
    const user = ensureUser(req, res)
    if (!user) return

    const entryId = req.params.id
    const existing = await findIllnessForUser(user.id, entryId)
    if (!existing) {
        return res.status(404).json({
            status: 404,
            message: 'Illness record not found.'
        })
    }

    await prisma.illnessEntry.delete({
        where: { id: entryId }
    })

    return res.status(204).json({
        status: 204,
        message: 'Illness record deleted.'
    })
}

export {
    createBloodPressureRecord,
    createBloodSugarRecord,
    createBodyWeightRecord,
    getBodyWeightRecords,
    getBloodPressureRecords,
    getBloodSugarRecords,
    getBloodPressureRecord,
    getBloodSugarRecord,
    getBodyWeightRecord,
    updateBloodPressureRecord,
    updateBloodSugarRecord,
    updateBodyWeightRecord,
    createIllnessRecord,
    getIllnessRecords,
    getIllnessRecord,
    updateIllnessRecord,
    deleteIllnessRecord
}
