import { useQuery } from '@tanstack/react-query'
import type { HeaderContents } from '@/types'

type SongDetailsResponse = {
	songId: string
	headerContents: HeaderContents
}

export function useSongDetails(path: string) {
	return useQuery({
		queryKey: ['song-details', path],
		queryFn: async (): Promise<SongDetailsResponse> => {
			const res = await fetch(`/api/songs/${path}/details`)
			if (!res.ok) {
				const error = await res.json()
				throw new Error(error.error || 'Failed to fetch song details')
			}
			return res.json()
		},
		enabled: !!path,
		staleTime: 30 * 60 * 1000, // 30 minutes - song details don't change often
	})
}
