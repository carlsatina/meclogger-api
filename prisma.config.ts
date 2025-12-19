import path from 'path'
import dotenv from 'dotenv'
import { defineConfig, env } from '@prisma/config'

const prismaEnvPath = path.resolve(process.cwd(), 'prisma/.env')

dotenv.config({ path: prismaEnvPath })
dotenv.config()

const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
    ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}),
  },
})
