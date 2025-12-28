import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

const adapter = new PrismaPg({
	connectionString: process.env.DATABASE_URL,
})

const prismaClientSingleton = () => {
	return new PrismaClient({ adapter })
}

declare global {
	var prismaGlobal: ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma

// Only export on server-side to prevent client-side import issues
let prismaExport: PrismaClient

if (typeof window === 'undefined') {
	// Server-side only
	prismaExport = prisma
} else {
	// This should never be called in client-side, but TypeScript needs it
	prismaExport = {} as PrismaClient
}

export { prismaExport as prisma }
