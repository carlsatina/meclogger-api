import prisma from '../../lib/prisma'
import { ExtendedRequest } from '../../extendedRequest'
import { RecordType } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import type { Express } from 'express'
import { uploadImageToStorage } from '../services/blobStorage'
import {
    MEDICAL_RECORD_MAX_TOTAL_BYTES,
    MEDICAL_RECORD_MAX_TOTAL_MB,
    MEDICAL_RECORD_MAX_FILE_MB
} from '../config/limits'

const RECORDS_PUBLIC_PATH = '/records'
const RECORDS_UPLOAD_PATH = path.resolve(process.cwd(), 'uploaded-images', 'records')

const attachmentsWithinLimit = (files: Express.Multer.File[], res: any) => {
    if (!files.length) return true
    const totalBytes = files.reduce((sum, file) => sum + (file?.size || 0), 0)
    if (totalBytes > MEDICAL_RECORD_MAX_TOTAL_BYTES) {
        res.status(413).json({
            status: 413,
            message: `Attachments too large. Maximum combined size is ${MEDICAL_RECORD_MAX_TOTAL_MB}MB (limit ${MEDICAL_RECORD_MAX_FILE_MB}MB per file).`
        })
        return false
    }
    return true
}

const isRemoteUrl = (url: string) => /^https?:\/\//i.test(url)

const normalizeRecordType = (type?: string): RecordType => {
    if (!type || typeof type !== 'string') return RecordType.OTHER
    const normalized = type.toUpperCase().replace(/[\s-]+/g, '_')
    const validTypes = Object.values(RecordType) as string[]
    if (validTypes.includes(normalized)) {
        return normalized as RecordType
    }
    return RecordType.OTHER
}

const resolveDiskPathForFile = (fileUrl: string): string | null => {
    if (isRemoteUrl(fileUrl)) return null
    const normalized = fileUrl.replace(/^\/+/, '') // strip leading slash
    return path.join(RECORDS_UPLOAD_PATH, normalized.replace(/^records\/?/, ''))
}

const resolveProfileForUser = async(userId: string, profileId?: string) => {
    if (!profileId) return null
    return prisma.profile.findFirst({
        where: {
            id: profileId,
            userId
        }
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

const parseTagsInput = (value: unknown): string[] | null => {
    if (typeof value === 'undefined') return null
    if (Array.isArray(value)) {
        return value.map(tag => String(tag).trim()).filter(Boolean)
    }
    if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!trimmed.length) return []
        try {
            const parsed = JSON.parse(trimmed)
            if (Array.isArray(parsed)) {
                return parsed.map(tag => String(tag).trim()).filter(Boolean)
            }
        } catch {
            // ignore JSON parse failure, fall through to comma split
        }
        return trimmed.split(',').map(tag => tag.trim()).filter(Boolean)
    }
    return []
}

const parseIdsInput = (value: unknown): string[] => {
    if (typeof value === 'undefined' || value === null) return []
    if (Array.isArray(value)) {
        return value.map(id => String(id)).filter(Boolean)
    }
    if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!trimmed.length) return []
        try {
            const parsed = JSON.parse(trimmed)
            if (Array.isArray(parsed)) {
                return parsed.map(id => String(id)).filter(Boolean)
            }
        } catch {
            // ignore and treat as comma separated
        }
        return trimmed.split(',').map(id => id.trim()).filter(Boolean)
    }
    return []
}

const listMedicalRecords = async (req: ExtendedRequest, res: any) => {
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

    const records = await prisma.medicalRecord.findMany({
        where: { profileId: profile.id },
        orderBy: { recordDate: 'desc' },
        include: {
            files: true
        }
    })

    res.status(200).json({
        status: 200,
        records
    })
}

const getMedicalRecord = async (req: ExtendedRequest, res: any) => {
    const user = ensureUser(req, res)
    if (!user) return

    const recordId = req.params.id
    if (!recordId) {
        return res.status(400).json({
            status: 400,
            message: 'Record ID is required.'
        })
    }

    const record = await prisma.medicalRecord.findFirst({
        where: {
            id: recordId,
            profile: {
                userId: user.id
            }
        },
        include: {
            files: true,
            profile: true
        }
    })

    if (!record) {
        return res.status(404).json({
            status: 404,
            message: 'Record not found.'
        })
    }

    res.status(200).json({
        status: 200,
        record
    })
}

const createMedicalRecord = async (req: ExtendedRequest, res: any) => {
    const user = ensureUser(req, res)
    if (!user) return

    const {
        profileId,
        title,
        recordType = RecordType.OTHER,
        recordDate,
        providerName,
        notes,
        tags
    } = req.body

    if (!profileId || !title || !recordDate) {
        return res.status(400).json({
            status: 400,
            message: 'profileId, title and recordDate are required.'
        })
    }

    const profile = await resolveProfileForUser(user.id, profileId)
    if (!profile) {
        return res.status(404).json({
            status: 404,
            message: 'Profile not found for current user.'
        })
    }

    const files = (req.files as Express.Multer.File[]) || []

    if (!attachmentsWithinLimit(files, res)) {
        return
    }

    const record = await prisma.medicalRecord.create({
        data: {
            profileId: profile.id,
            title,
            recordType: normalizeRecordType(recordType as string),
            recordDate: new Date(recordDate),
            providerName,
            notes,
            tags: parseTagsInput(tags) ?? []
        },
        include: {
            files: true
        }
    })

    if (files.length) {
        try {
            const uploads = await Promise.all(files.map(file => uploadImageToStorage(file, 'records')))
            const fileData = files.map((file, idx) => ({
                url: uploads[idx].url,
                mimeType: file.mimetype,
                sizeBytes: file.size,
                originalName: file.originalname,
                recordId: record.id
            }))
            await prisma.fileAsset.createMany({
                data: fileData
            })
        } catch (error: any) {
            const message = error?.message || 'Unable to upload files'
            return res.status(500).json({ status: 500, message })
        }
    }

    const recordWithFiles = await prisma.medicalRecord.findUnique({
        where: { id: record.id },
        include: { files: true }
    })

    res.status(201).json({
        status: 201,
        record: recordWithFiles
    })
}

const updateMedicalRecord = async (req: ExtendedRequest, res: any) => {
    const user = ensureUser(req, res)
    if (!user) return

    const recordId = req.params.id
    const existing = await prisma.medicalRecord.findFirst({
        where: {
            id: recordId,
            profile: {
                userId: user.id
            }
        }
    })

    if (!existing) {
        return res.status(404).json({
            status: 404,
            message: 'Record not found.'
        })
    }

    const {
        title,
        recordType,
        recordDate,
        providerName,
        notes,
        tags,
        filesToRemove
    } = req.body
    const files = (req.files as Express.Multer.File[]) || []
    if (!attachmentsWithinLimit(files, res)) {
        return
    }
    const parsedTags = parseTagsInput(tags)
    const filesMarkedForRemoval = parseIdsInput(filesToRemove)

    const updated = await prisma.medicalRecord.update({
        where: { id: recordId },
        data: {
            title,
            recordType: recordType ? normalizeRecordType(recordType as string) : existing.recordType,
            recordDate: recordDate ? new Date(recordDate) : existing.recordDate,
            providerName,
            notes,
            ...(parsedTags !== null ? { tags: parsedTags } : {})
        },
        include: { files: true }
    })

    if (filesMarkedForRemoval.length) {
        const removableFiles = await prisma.fileAsset.findMany({
            where: {
                id: { in: filesMarkedForRemoval },
                recordId
            }
        })

        if (removableFiles.length) {
            await prisma.fileAsset.deleteMany({
                where: {
                    id: { in: removableFiles.map(file => file.id) },
                    recordId
                }
            })

            removableFiles.forEach(file => {
                const filePath = resolveDiskPathForFile(file.url)
                if (filePath) {
                    fs.unlink(filePath, () => {
                        // ignore errors
                    })
                }
            })
        }
    }

    if (files.length) {
        try {
            const uploads = await Promise.all(files.map(file => uploadImageToStorage(file, 'records')))
            const fileData = files.map((file, idx) => ({
                url: uploads[idx].url,
                mimeType: file.mimetype,
                sizeBytes: file.size,
                originalName: file.originalname,
                recordId: recordId
            }))
            await prisma.fileAsset.createMany({
                data: fileData
            })
        } catch (error: any) {
            const message = error?.message || 'Unable to upload files'
            return res.status(500).json({ status: 500, message })
        }
    }

    const updatedWithFiles = await prisma.medicalRecord.findUnique({
        where: { id: recordId },
        include: { files: true }
    })

    res.status(200).json({
        status: 200,
        record: updatedWithFiles
    })
}

const deleteMedicalRecord = async (req: ExtendedRequest, res: any) => {
    const user = ensureUser(req, res)
    if (!user) return

    const recordId = req.params.id
    const existing = await prisma.medicalRecord.findFirst({
        where: {
            id: recordId,
            profile: {
                userId: user.id
            }
        }
    })

    if (!existing) {
        return res.status(404).json({
            status: 404,
            message: 'Record not found.'
        })
    }

    const files = await prisma.fileAsset.findMany({
        where: { recordId }
    })

    await prisma.fileAsset.deleteMany({
        where: { recordId }
    })

    await prisma.medicalRecord.delete({
        where: { id: recordId }
    })

    files.forEach(file => {
        const filePath = resolveDiskPathForFile(file.url)
        if (filePath) {
            fs.unlink(filePath, () => {
                // ignore errors
            })
        }
    })

    res.status(200).json({
        status: 200,
        message: 'Record deleted successfully.'
    })
}

export {
    listMedicalRecords,
    getMedicalRecord,
    createMedicalRecord,
    updateMedicalRecord,
    deleteMedicalRecord
}
