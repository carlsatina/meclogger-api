import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { Pool } from 'pg'

const prismaEnvPath = path.resolve(process.cwd(), 'prisma/.env')

dotenv.config({ path: prismaEnvPath })
dotenv.config()

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set in the environment')
}

const parseBoolean = (val: string | undefined, fallback: boolean) => {
  if (val === undefined) return fallback
  return ['1', 'true', 'yes', 'on'].includes(val.toLowerCase())
}

const readCaFromEnv = (): string | null => {
  const inlineCa = process.env.DB_SSL_CA
  if (inlineCa && inlineCa.trim().length > 0) {
    return inlineCa
  }
  const inlineCaB64 = process.env.DB_SSL_CA_B64
  if (inlineCaB64 && inlineCaB64.trim().length > 0) {
    try {
      return Buffer.from(inlineCaB64, 'base64').toString('utf8')
    } catch {
      throw new Error('Invalid base64 content in DB_SSL_CA_B64')
    }
  }
  return null
}

const getSslConfig = () => {
  // Allow disabling SSL entirely (e.g., local Postgres without TLS).
  const { hostname } = new URL(connectionString)
  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(hostname)
  const disableSsl = parseBoolean(process.env.DB_SSL_DISABLE, isLocalHost)
  if (disableSsl) {
    return false
  }

  const rejectUnauthorized = parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, true)
  const servername = process.env.DB_SSL_SERVERNAME || hostname

  const caFromEnv = readCaFromEnv()
  if (caFromEnv) {
    return { ca: caFromEnv, rejectUnauthorized, servername }
  }

  const envCaPath = process.env.DB_SSL_CA_PATH
  const defaultCaPath = path.resolve(process.cwd(), 'certs', 'db-ca.crt')
  const chosenPath = envCaPath
    ? path.resolve(process.cwd(), envCaPath)
    : defaultCaPath

  if (fs.existsSync(chosenPath)) {
    const ca = fs.readFileSync(chosenPath, 'utf8')
    return { ca, rejectUnauthorized, servername }
  }

  // Development or explicit override fallback without CA.
  if (process.env.NODE_ENV === 'development' || rejectUnauthorized === false) {
    return { rejectUnauthorized: false, servername }
  }

  throw new Error(
    'DB_SSL_CA_PATH is required for secure TLS with your provider. ' +
    'Set DB_SSL_CA_PATH (or DB_SSL_CA / DB_SSL_CA_B64) to the root CA file path.'
  )
}

const pool = new Pool({
  connectionString,
  ssl: getSslConfig(),
})
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

export default prisma
