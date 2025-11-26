// import { PrismaClient } from '@/generated/prisma'

// const globalForPrisma = global as unknown as {
// 	prisma: PrismaClient
// }

// export const prisma = globalForPrisma.prisma || new PrismaClient()

// if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
	connectionString: process.env.DATABASE_URL,
})

const prismaClientSingleton = () => {
	return new PrismaClient({ adapter })
}

declare const globalThis: {
	prismaGlobal: ReturnType<typeof prismaClientSingleton>
} & typeof global
export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

// export default prisma
if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
