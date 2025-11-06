import { GENIUS_API_BASE } from '@/constants'
import type { GeniusSongHit, GeniusSongInfo, NormalizedSong } from '@/types'

const ensureToken = () => {
	const token = process.env.GENIUS_API_TOKEN

	if (!token) {
		throw new Error(
			'GENIUS_API_TOKEN is not set. Add it to your environment to enable Genius search fallback.'
		)
	}

	return token
}

export async function searchGeniusSongs(
	query: string
): Promise<NormalizedSong[]> {
	const token = ensureToken()

	const response = await fetch(
		`${GENIUS_API_BASE}/search?q=${encodeURIComponent(query)}`,
		{
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${token}`,
			},
			next: {
				revalidate: 0,
			},
		}
	)

	if (!response.ok) {
		throw new Error(`Genius search failed with status ${response.status}`)
	}

	const payload = (await response.json()) as {
		response?: {
			hits?: GeniusSongHit[]
		}
	}

	const hits = payload.response?.hits ?? []

	return hits
		.map((hit) => hit.result)
		.filter((result): result is NonNullable<typeof result> => Boolean(result))
		.map((result) => ({
			geniusId: result.id,
			title: result.title,
			artist: result.primary_artist?.name ?? 'Unknown Artist',
			album: result.primary_album?.name ?? undefined,
			releaseDate: result.release_date_for_display ?? undefined,
			artworkUrl: result.song_art_image_url ?? undefined,
			language: result.language ?? undefined,
			url: result.url ?? undefined,
			path: result.path ?? undefined,
		}))
}

export async function fetchGeniusSongDetails(
	geniusId: number | string
): Promise<GeniusSongInfo> {
	const token = ensureToken()
	const idValue =
		typeof geniusId === 'number'
			? Math.trunc(geniusId)
			: Number.parseInt(String(geniusId).trim(), 10)

	if (!Number.isFinite(idValue)) {
		throw new Error(`Invalid Genius song id: ${geniusId}`)
	}

	const id = idValue.toString()

	const response = await fetch(`${GENIUS_API_BASE}/songs/${id}`, {
		headers: {
			Accept: 'application/json',
			Authorization: `Bearer ${token}`,
		},
		next: {
			revalidate: 0,
		},
	})

	if (!response.ok) {
		throw new Error(
			`Genius song details fetch failed with status ${response.status}`
		)
	}

	const payload = (await response.json()) as {
		response?: {
			song?: GeniusSongInfo
		}
	}

	const song = payload.response?.song

	if (!song) {
		throw new Error('Genius song details payload did not include song data.')
	}

	return song
}
