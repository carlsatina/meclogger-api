import { promises as fs } from 'fs'
import path from 'path'
import type { Express } from 'express'
import type { PutBlobResult } from '@vercel/blob'
import { Client as MinioClient } from 'minio'

type UploadResult = {
    url: string
    provider: 'vercel-blob' | 'local' | 'minio'
}

type ProcessedFile = {
    buffer: Buffer
    mimeType: string
    extension: string
    originalName: string
}

const MAX_IMAGE_BYTES = 1 * 1024 * 1024 // 1MB
const imageMimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif'
}

const sanitizeFileName = (name: string) => {
    const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '-')
    const trimmed = cleaned.replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '')
    return trimmed || 'upload'
}

const getExtFromMime = (mime: string) => imageMimeMap[mime] || 'bin'

const processImageIfNeeded = async(file: Express.Multer.File): Promise<ProcessedFile> => {
    const isImage = Boolean(imageMimeMap[file.mimetype])
    if (!isImage || file.size <= MAX_IMAGE_BYTES) {
        return {
            buffer: file.buffer,
            mimeType: file.mimetype,
            extension: getExtFromMime(file.mimetype),
            originalName: file.originalname
        }
    }

    try {
        const sharp = (await import('sharp')).default
        const maxDimension = 1800
        const qualities = [80, 65, 50]
        let output: Buffer | null = null

        for (const quality of qualities) {
            const candidate = await sharp(file.buffer)
                .rotate()
                .resize({ width: maxDimension, height: maxDimension, fit: 'inside' })
                .webp({ quality })
                .toBuffer()
            output = candidate
            if (candidate.byteLength <= MAX_IMAGE_BYTES) break
        }

        if (!output) {
            output = file.buffer
        }

        return {
            buffer: output,
            mimeType: 'image/webp',
            extension: 'webp',
            originalName: file.originalname
        }
    } catch (e) {
        // If processing fails, fall back to original buffer
        console.warn('Image processing failed, using original buffer', e)
        return {
            buffer: file.buffer,
            mimeType: file.mimetype,
            extension: getExtFromMime(file.mimetype),
            originalName: file.originalname
        }
    }
}

const writeToLocalDisk = async(
    file: Express.Multer.File,
    folder: string,
    processed: ProcessedFile
): Promise<UploadResult> => {
    const uploadDir = path.resolve(process.cwd(), 'uploaded-images', folder)
    await fs.mkdir(uploadDir, { recursive: true })

    const base = sanitizeFileName(path.parse(processed.originalName).name)
    const filename = `${Date.now()}-${base}.${processed.extension}`
    const filePath = path.join(uploadDir, filename)

    await fs.writeFile(filePath, processed.buffer)

    return {
        url: `/${folder}/${filename}`,
        provider: 'local'
    }
}

const hasMinioConfig = () => {
    const endpoint = process.env.MINIO_ENDPOINT
    const accessKey = process.env.MINIO_ACCESS_KEY
    const secretKey = process.env.MINIO_SECRET_KEY
    const bucket = process.env.MINIO_BUCKET
    return Boolean(endpoint && accessKey && secretKey && bucket)
}

const uploadToMinio = async(processed: ProcessedFile, folder: string): Promise<UploadResult> => {
    const endpoint = process.env.MINIO_ENDPOINT
    const accessKey = process.env.MINIO_ACCESS_KEY
    const secretKey = process.env.MINIO_SECRET_KEY
    const bucket = process.env.MINIO_BUCKET
    if (!endpoint || !accessKey || !secretKey || !bucket) {
        throw new Error('Missing MinIO configuration')
    }

    const useSSL = String(process.env.MINIO_USE_SSL || '').toLowerCase() === 'true'
    const port = process.env.MINIO_PORT ? Number(process.env.MINIO_PORT) : (useSSL ? 443 : 80)
    const client = new MinioClient({
        endPoint: endpoint,
        port,
        accessKey,
        secretKey,
        useSSL
    })

    const uniqueSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    const base = sanitizeFileName(path.parse(processed.originalName).name)
    const objectName = `${folder}/${uniqueSuffix}-${base}.${processed.extension}`

    await client.putObject(bucket, objectName, processed.buffer, {
        'Content-Type': processed.mimeType
    })

    const publicBase = process.env.MINIO_PUBLIC_URL
        || `${useSSL ? 'https' : 'http'}://${endpoint}${process.env.MINIO_PORT ? `:${port}` : ''}`
    const url = `${publicBase}/${bucket}/${objectName}`

    return {
        url,
        provider: 'minio'
    }
}

const uploadToVercelBlob = async(file: Express.Multer.File, folder: string, token: string, processed: ProcessedFile) => {
    const uniqueSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    const base = sanitizeFileName(path.parse(processed.originalName).name)
    const filename = `${uniqueSuffix}-${base}.${processed.extension}`
    const key = `${folder}/${filename}`

    const { put } = await import('@vercel/blob')
    const blob: PutBlobResult = await put(key, processed.buffer, {
        access: 'public',
        token,
        contentType: processed.mimeType,
        addRandomSuffix: false
    })

    const result: UploadResult = { url: blob.url, provider: 'vercel-blob' }
    return result
}

export const uploadImageToStorage = async(
    file: Express.Multer.File,
    folder: string = 'vehicles'
): Promise<UploadResult> => {
    const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN

    if (!file?.buffer || !file.originalname) {
        throw new Error('Invalid file upload payload')
    }

    const processed = await processImageIfNeeded(file)

    if (token) {
        try {
            return await uploadToVercelBlob(file, folder, token, processed)
        } catch (error) {
            // Fall back to local disk when blob upload is not available (e.g., local dev).
            console.warn('Vercel Blob upload failed, falling back to local storage', error)
        }
    }

    if (hasMinioConfig()) {
        try {
            return await uploadToMinio(processed, folder)
        } catch (err) {
            console.warn('MinIO upload failed, falling back to local storage', err)
        }
    }

    return writeToLocalDisk(file, folder, processed)
}
