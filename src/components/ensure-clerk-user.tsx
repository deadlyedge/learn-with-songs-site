import { ensureClerkUserRecord } from '@/lib/ensure-clerk-user'

export const EnsureClerkUser = async () => {
	await ensureClerkUserRecord()

	return null
}
