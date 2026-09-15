import 'server-only'
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

// 全局单例，避免 dev 热重载重复创建连接池
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createClient() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
