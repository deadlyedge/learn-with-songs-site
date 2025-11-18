import { initialUser } from '@/lib/clerk-auth'

export const EnsureClerkUser = async () => {
	await initialUser()

	return null
}
