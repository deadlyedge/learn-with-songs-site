import {
	DB_REFETCH_STRATEGY,
	type DbRefetchResource,
	type DbRefetchStrategy,
} from '@/constants'

const STRATEGY_TO_MILLISECONDS: Record<DbRefetchStrategy, number> = {
	year: 1000 * 60 * 60 * 24 * 365,
	'half-year': 1000 * 60 * 60 * 24 * 182,
	'3months': 1000 * 60 * 60 * 24 * 90,
} as const

export const getDbRefetchWindowMs = (resource: DbRefetchResource) => {
	const strategy = DB_REFETCH_STRATEGY[resource]
	return STRATEGY_TO_MILLISECONDS[strategy]
}

const toDate = (value: Date | string | null | undefined) => {
	if (!value) {
		return null
	}

	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value
	}

	const parsed = new Date(value)
	return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const isDbResourceStale = (
	lastFetchedAt: Date | string | null | undefined,
	resource: DbRefetchResource
) => {
	const date = toDate(lastFetchedAt)
	if (!date) {
		return true
	}

	const ageMs = Date.now() - date.getTime()
	return ageMs >= getDbRefetchWindowMs(resource)
}
