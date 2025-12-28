import { useQuery } from '@tanstack/react-query'
import type { FeaturedSong } from '@/types'

export function useFeaturedSongs() {
	return useQuery({
		queryKey: ['featured-songs'],
		queryFn: async (): Promise<FeaturedSong[]> => {
			const res = await fetch('/api/featured-songs')
			if (!res.ok) {
				const error = await res.json()
				throw new Error(error.error || 'Failed to fetch featured songs')
			}
			const data = await res.json()
			return data.featuredSongs
		},
		staleTime: 30 * 60 * 1000, // 30 minutes - featured songs don't change often
	})
}
