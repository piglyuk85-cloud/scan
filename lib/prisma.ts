import { PrismaClient } from '@prisma/client'

try {
  if (!process.env.DATABASE_URL && typeof require !== 'undefined') {
    require('dotenv').config()
  }
} catch (e) {
  // dotenv не установлен или не нужен
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
