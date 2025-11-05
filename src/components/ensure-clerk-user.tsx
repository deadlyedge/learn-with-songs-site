import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export const EnsureClerkUser = async () => {
	const user = await currentUser()

	if (!user) {
		return null
	}

	const primaryEmail = user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)
	const fallbackEmail = user.emailAddresses.at(0)
	const resolvedEmail =
		(primaryEmail ?? fallbackEmail)?.emailAddress ?? `${user.id}@users.clerk.local`

	await prisma.user.upsert({
		where: { clerkId: user.id },
		update: {
			name: user.fullName ?? user.username ?? null,
			email: resolvedEmail,
			imageUrl: user.imageUrl,
		},
		create: {
			clerkId: user.id,
			name: user.fullName ?? user.username ?? null,
			email: resolvedEmail,
			imageUrl: user.imageUrl,
		},
	})

	return null
}
