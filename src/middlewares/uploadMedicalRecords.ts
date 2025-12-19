import multer from 'multer'
import {
    MEDICAL_RECORD_MAX_FILE_BYTES,
    MEDICAL_RECORD_MAX_FILES
} from '../config/limits'

const uploadMedicalRecordFiles = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MEDICAL_RECORD_MAX_FILE_BYTES,
        files: MEDICAL_RECORD_MAX_FILES
    }
})

export default uploadMedicalRecordFiles
