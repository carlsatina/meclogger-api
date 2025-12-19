import multer, { FileFilterCallback } from 'multer'
import type { Express } from 'express'

const storage = multer.memoryStorage()

const fileFilter = (req: any, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (
        file.mimetype === 'image/jpeg' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/webp'
    ) {
        cb(null, true)
    } else {
        cb(new Error('Not an image! Please upload an image'))
    }
}

const uploadVehicleImage = multer({
    storage,
    limits: {
        fileSize: 2 * 1024 * 1024,
        files: 1
    },
    fileFilter
})

export default uploadVehicleImage
