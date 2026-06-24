import { promises as fs } from 'fs'
import path from 'path'
import type { Express } from 'express'
import type { PutBlobResult } from '@vercel/blob'
import { Client as MinioClient } from 'minio'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

type UploadResult = {
    url: string
    provider: 'vercel-blob' | 'local' | 'minio' | 'r2'
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

const processImageIfNeeded = async(
    file: Express.Multer.File,
    targetBytes: number = MAX_IMAGE_BYTES
): Promise<ProcessedFile> => {
    const isImage = Boolean(imageMimeMap[file.mimetype])
    if (!isImage || file.size <= targetBytes) {
        return {
            buffer: file.buffer,
            mimeType: file.mimetype,
            extension: getExtFromMime(file.mimetype),
            originalName: file.originalname
        }
    }

    try {
        const sharp = (await import('sharp')).default
        // Step down both dimension and quality until we land under the target.
        // Smaller targets (e.g. 200KB) just iterate further; the first candidate
        // that fits is returned, so most images settle quickly.
        const dimensions = [1800, 1440, 1080, 800]
        const qualities = [82, 70, 58, 46, 36]
        let smallest: Buffer | null = null

        for (const dimension of dimensions) {
            for (const quality of qualities) {
                const candidate = await sharp(file.buffer)
                    .rotate()
                    .resize({ width: dimension, height: dimension, fit: 'inside', withoutEnlargement: true })
                    .webp({ quality })
                    .toBuffer()
                if (!smallest || candidate.byteLength < smallest.byteLength) smallest = candidate
                if (candidate.byteLength <= targetBytes) {
                    return { buffer: candidate, mimeType: 'image/webp', extension: 'webp', originalName: file.originalname }
                }
            }
        }

        // Couldn't hit the target — use the smallest result we produced.
        return {
            buffer: smallest || file.buffer,
            mimeType: smallest ? 'image/webp' : file.mimetype,
            extension: smallest ? 'webp' : getExtFromMime(file.mimetype),
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

const hasR2Config = () => {
    const endpoint = process.env.R2_ENDPOINT
    const accessKey = process.env.R2_ACCESS_KEY
    const secretKey = process.env.R2_SECRET_KEY
    const bucket = process.env.R2_BUCKET
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

    // MINIO_ENDPOINT may be a bare host ("minio.example.com") or a full URL
    // ("http://minio.example.com"). The MinIO client only accepts a bare host,
    // so parse out the scheme/port when a URL is provided.
    let host = endpoint
    let useSSL = String(process.env.MINIO_USE_SSL || '').toLowerCase() === 'true'
    let port = process.env.MINIO_PORT ? Number(process.env.MINIO_PORT) : undefined
    if (/^https?:\/\//i.test(endpoint)) {
        const parsed = new URL(endpoint)
        host = parsed.hostname
        useSSL = parsed.protocol === 'https:'
        if (!port && parsed.port) port = Number(parsed.port)
    }
    const resolvedPort = port ?? (useSSL ? 443 : 80)
    const client = new MinioClient({
        endPoint: host,
        port: resolvedPort,
        accessKey,
        secretKey,
        useSSL
    })

    const uniqueSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    const base = sanitizeFileName(path.parse(processed.originalName).name)
    const objectName = `${folder}/${uniqueSuffix}-${base}.${processed.extension}`

    await client.putObject(bucket, objectName, processed.buffer, processed.buffer.length, {
        'Content-Type': processed.mimeType
    })

    const publicBase = process.env.MINIO_PUBLIC_URL
        || (/^https?:\/\//i.test(endpoint)
            ? endpoint.replace(/\/+$/, '')
            : `${useSSL ? 'https' : 'http'}://${host}${process.env.MINIO_PORT ? `:${resolvedPort}` : ''}`)
    const url = `${publicBase}/${bucket}/${objectName}`

    return {
        url,
        provider: 'minio'
    }
}

const uploadToR2 = async(processed: ProcessedFile, folder: string): Promise<UploadResult> => {
    const endpoint = process.env.R2_ENDPOINT
    const accessKey = process.env.R2_ACCESS_KEY
    const secretKey = process.env.R2_SECRET_KEY
    const bucket = process.env.R2_BUCKET
    const region = process.env.R2_REGION || 'auto'
    if (!endpoint || !accessKey || !secretKey || !bucket) {
        throw new Error('Missing R2 configuration')
    }

    const cleanEndpoint = endpoint.replace(/\/+$/, '')

    const s3 = new S3Client({
        region,
        endpoint: cleanEndpoint,
        credentials: {
            accessKeyId: accessKey,
            secretAccessKey: secretKey
        },
        forcePathStyle: true
    })

    const uniqueSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    const base = sanitizeFileName(path.parse(processed.originalName).name)
    const key = `${folder}/${uniqueSuffix}-${base}.${processed.extension}`

    await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: processed.buffer,
        ContentType: processed.mimeType
    }))

    const publicBase = (() => {
        if (process.env.R2_PUBLIC_URL) return process.env.R2_PUBLIC_URL.replace(/\/+$/, '')
        const accountId = process.env.R2_ACCOUNT_ID
        if (accountId) {
            return `https://${bucket}.${accountId}.r2.cloudflarestorage.com`
        }
        return `${cleanEndpoint}/${bucket}`
    })()
    const url = `${publicBase}/${key}`

    return { url, provider: 'r2' as const }
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

// Guard remote provider calls so a stalled connection (e.g. an unreachable
// MinIO/S3 endpoint behind a proxy) falls back to local storage instead of
// hanging the request indefinitely.
const UPLOAD_TIMEOUT_MS = Number(process.env.UPLOAD_TIMEOUT_MS) || 15000
const withTimeout = <T>(promise: Promise<T>, label: string): Promise<T> =>
    Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`${label} upload timed out after ${UPLOAD_TIMEOUT_MS}ms`)), UPLOAD_TIMEOUT_MS)
        )
    ])

export const uploadImageToStorage = async(
    file: Express.Multer.File,
    folder: string = 'vehicles',
    options: { targetBytes?: number } = {}
): Promise<UploadResult> => {
    const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN

    if (!file?.buffer || !file.originalname) {
        throw new Error('Invalid file upload payload')
    }

    const processed = await processImageIfNeeded(file, options.targetBytes)

    if (token) {
        try {
            return await withTimeout(uploadToVercelBlob(file, folder, token, processed), 'Vercel Blob')
        } catch (error) {
            console.warn('Vercel Blob upload failed, falling back to other providers', error)
        }
    }

    if (hasR2Config()) {
        try {
            return await withTimeout(uploadToR2(processed, folder), 'R2')
        } catch (err) {
            console.warn('R2 upload failed, falling back to other providers', err)
        }
    }

    if (hasMinioConfig()) {
        try {
            return await withTimeout(uploadToMinio(processed, folder), 'MinIO')
        } catch (err) {
            console.warn('MinIO upload failed, falling back to local storage', err)
        }
    }

    return writeToLocalDisk(file, folder, processed)
}
