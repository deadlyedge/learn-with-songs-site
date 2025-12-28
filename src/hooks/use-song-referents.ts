import { useQuery } from '@tanstack/react-query'
import type { NormalizedReferent } from '@/types'

type ReferentsResponse = {
	referents: NormalizedReferent[]
}

export function useSongReferents(path: string) {
	return useQuery({
		queryKey: ['song-referents', path],
		queryFn: async (): Promise<ReferentsResponse> => {
			const res = await fetch(`/api/songs/${path}/referents`)
			if (!res.ok) {
				const error = await res.json()
				throw new Error(error.error || 'Failed to fetch song referents')
			}
			return res.json()
		},
		enabled: !!path,
		staleTime: 30 * 60 * 1000, // 30 minutes - referents don't change often
	})
}
