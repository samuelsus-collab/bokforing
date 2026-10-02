import { PrismaClient } from '@prisma/client'

// En delad Prisma-klient för hela appen.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
})
