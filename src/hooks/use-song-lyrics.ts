import { useQuery } from '@tanstack/react-query'

type LyricsResponse = {
	lyricLines: string[]
	lyricsError: string | null
}

export function useSongLyrics(path: string) {
	return useQuery({
		queryKey: ['song-lyrics', path],
		queryFn: async (): Promise<LyricsResponse> => {
			const res = await fetch(`/api/songs/${path}/lyrics`)
			if (!res.ok) {
				const error = await res.json()
				throw new Error(error.error || 'Failed to fetch song lyrics')
			}
			return res.json()
		},
		enabled: !!path,
		staleTime: 30 * 60 * 1000, // 30 minutes - lyrics don't change often
	})
}
