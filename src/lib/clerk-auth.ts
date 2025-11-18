'use server'

import { currentUser } from '@clerk/nextjs/server'

import { prisma } from '@/lib/prisma'

export async function initialUser() {
	const clerkUser = await currentUser()
	if (!clerkUser) {
		return null
	}

	const primaryEmail = clerkUser.emailAddresses.find(
		(email) => email.id === clerkUser.primaryEmailAddressId
	)
	const fallbackEmail = clerkUser.emailAddresses.at(0)
	const resolvedEmail =
		(primaryEmail ?? fallbackEmail)?.emailAddress ?? `${clerkUser.id}@users.clerk.local`

	return prisma.user.upsert({
		where: { clerkId: clerkUser.id },
		update: {
			name: clerkUser.fullName ?? clerkUser.username ?? null,
			email: resolvedEmail,
			imageUrl: clerkUser.imageUrl,
		},
		create: {
			clerkId: clerkUser.id,
			name: clerkUser.fullName ?? clerkUser.username ?? null,
			email: resolvedEmail,
			imageUrl: clerkUser.imageUrl,
		},
	})
}
