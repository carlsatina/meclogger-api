import dotenv from 'dotenv'

dotenv.config()

const MB = 1024 * 1024

const parsePositiveNumber = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const MEDICAL_RECORD_MAX_FILES = parsePositiveNumber(process.env.MEDICAL_RECORD_MAX_FILES, 5)
export const MEDICAL_RECORD_MAX_FILE_MB = parsePositiveNumber(process.env.MEDICAL_RECORD_MAX_FILE_MB, 10)
export const MEDICAL_RECORD_MAX_TOTAL_MB = parsePositiveNumber(
    process.env.MEDICAL_RECORD_MAX_TOTAL_MB,
    MEDICAL_RECORD_MAX_FILE_MB * MEDICAL_RECORD_MAX_FILES
)

export const MEDICAL_RECORD_MAX_FILE_BYTES = MEDICAL_RECORD_MAX_FILE_MB * MB
export const MEDICAL_RECORD_MAX_TOTAL_BYTES = MEDICAL_RECORD_MAX_TOTAL_MB * MB

export const REQUEST_BODY_LIMIT = process.env.REQUEST_BODY_LIMIT || `${MEDICAL_RECORD_MAX_TOTAL_MB}mb`
