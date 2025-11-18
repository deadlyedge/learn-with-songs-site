import { unstable_cache } from 'next/cache'
import { Lyric } from './lyric'

async function fetchSongLyrics(path: string) {
	const response = await fetch(
		`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/songs/lyrics/${path}`,
		{
			next: { revalidate: 86400 }, // 24 hours cache - lyrics don't change often
		}
	)

	if (!response.ok) {
		if (response.status === 404) {
			throw new Error('Song not found')
		}
		throw new Error('Failed to fetch lyrics')
	}

	return response.json()
}

const cachedFetchSongLyrics = unstable_cache(
	fetchSongLyrics,
	['song-lyrics'],
	{ revalidate: 86400 }
)

type LyricsData = {
	lyricLines: string[]
	lyricsError: string | null
}

export async function LyricsSection({ path }: { path: string }) {
	const data: LyricsData = await cachedFetchSongLyrics(path)

	return (
		<Lyric
			error={data.lyricsError}
			lyricLines={data.lyricLines}
		/>
	)
}
