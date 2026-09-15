import 'dotenv/config'
import { z } from 'zod'

// Validerar alla miljövariabler vid uppstart – processen avslutas om något saknas.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3101),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL krävs'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET måste vara minst 16 tecken'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  FRONTEND_URL: z.string().default('http://localhost:5273'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Ogiltig miljökonfiguration:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data
