import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { SongSearchResponse } from '@/types'

export function useSearchSongs() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			query,
			source,
		}: {
			query: string
			source?: string | null
		}): Promise<SongSearchResponse> => {
			const params = new URLSearchParams({
				query: query.trim(),
			})

			if (source) {
				params.append('source', source)
			}

			const res = await fetch(`/api/search?${params}`)
			if (!res.ok) {
				const error = await res.json()
				throw new Error(error.error || 'Failed to search songs')
			}
			return res.json()
		},
		onSuccess: () => {
			// Optionally invalidate related queries
			// This can help keep search suggestions fresh
			queryClient.invalidateQueries({ queryKey: ['suggestions'] })
		},
	})
}
