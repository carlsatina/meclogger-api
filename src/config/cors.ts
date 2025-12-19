import { CorsOptions } from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const DEFAULT_ALLOWED_ORIGINS = [
    'https://meclogger.com',
    'https://www.meclogger.com',
    'https://api.meclogger.com',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:9000'
]

const DEFAULT_ALLOWED_SUFFIXES = ['.meclogger.com']

const parseOrigins = (raw?: string | null): string[] => {
    if (!raw) return []
    return raw
        .split(/[,\s]+/) // allow comma or whitespace separated lists
        .map(origin => origin.trim())
        .filter(Boolean)
}

const allowAll = String(process.env.CORS_ALLOW_ALL || '').toLowerCase() === 'true'

const normalizeOrigin = (origin?: string | null): string | null => {
    if (!origin) return null
    return origin.replace(/\/+$/, '').toLowerCase()
}

const allowedOrigins = (() => {
    const fromEnv = parseOrigins(process.env.CORS_ALLOWED_ORIGINS)
    if (fromEnv.length) return fromEnv
    return DEFAULT_ALLOWED_ORIGINS
})()

const allowedOriginSet = new Set(allowedOrigins.map(normalizeOrigin).filter(Boolean) as string[])

const allowedSuffixes = (() => {
    const fromEnv = parseOrigins(process.env.CORS_ALLOWED_SUFFIXES)
    if (fromEnv.length) return fromEnv
    return DEFAULT_ALLOWED_SUFFIXES
})().map(suffix => suffix.toLowerCase())

export const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
        if (allowAll) {
            return callback(null, true)
        }
        // Allow non-browser clients (no origin) and any explicitly allowed origin.
        const normalized = normalizeOrigin(origin)
        if (!normalized || allowedOriginSet.has(normalized)) {
            return callback(null, true)
        }
        if (allowedSuffixes.some(suffix => normalized.endsWith(suffix))) {
            return callback(null, true)
        }
        // Fallback: disallow origin without crashing the server.
        callback(null, false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200,
    maxAge: 86400
}

export const allowedOriginsList = allowedOrigins
