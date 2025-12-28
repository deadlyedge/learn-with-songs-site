import { useQuery } from '@tanstack/react-query'
import type { Suggestion } from '@/types'

export function useSearchSuggestions(query: string, limit?: number) {
	return useQuery({
		queryKey: ['suggestions', query, limit],
		queryFn: async (): Promise<Suggestion[]> => {
			if (!query || query.trim().length < 2) {
				return []
			}

			const params = new URLSearchParams({
				query: query.trim(),
			})

			if (limit) {
				params.append('limit', limit.toString())
			}

			const res = await fetch(`/api/suggestions?${params}`)
			if (!res.ok) {
				const error = await res.json()
				throw new Error(error.error || 'Failed to fetch suggestions')
			}
			const data = await res.json()
			return data.suggestions
		},
		enabled: query.length >= 2,
		staleTime: 5 * 60 * 1000, // 5 minutes - suggestions can be cached
	})
}
