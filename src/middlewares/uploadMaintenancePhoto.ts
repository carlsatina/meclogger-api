import multer, { FileFilterCallback } from 'multer'
import type { Express } from 'express'

const storage = multer.memoryStorage()

const fileFilter = (req: any, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (
        file.mimetype === 'image/jpeg' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/webp' ||
        file.mimetype === 'image/heic' ||
        file.mimetype === 'image/heif'
    ) {
        cb(null, true)
    } else {
        cb(new Error('Not an image! Please upload a photo of the receipt or parts.'))
    }
}

// Accept large originals (phone photos); they're compressed to ~200KB on upload.
const uploadMaintenancePhoto = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 6
    },
    fileFilter
})

export default uploadMaintenancePhoto
