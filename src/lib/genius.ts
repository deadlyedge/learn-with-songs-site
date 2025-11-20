import { GENIUS_API_BASE } from '@/constants'
import type { GeniusSongHit, NormalizedSong } from '@/types'
import { Referent } from '@/types/referentsAPI'
import type { GeniusSongInfoRaw } from '@/types/songsAPI'

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
				revalidate: 86400,
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
): Promise<GeniusSongInfoRaw> {
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
			revalidate: 86400,
		},
	})

	if (!response.ok) {
		throw new Error(
			`Genius song details fetch failed with status ${response.status}`
		)
	}

	const payload = (await response.json()) as {
		response?: {
			song?: GeniusSongInfoRaw
		}
	}

	const song = payload.response?.song

	if (!song) {
		throw new Error('Genius song details payload did not include song data.')
	}

	return song
}

export async function fetchGeniusReferents(
	songId: number | string
): Promise<Referent[]> {
	const token = ensureToken()
	const idValue =
		typeof songId === 'number'
			? Math.trunc(songId)
			: Number.parseInt(String(songId).trim(), 10)

	if (!Number.isFinite(idValue)) {
		throw new Error(`Invalid Genius song id: ${songId}`)
	}

	const id = idValue.toString()

	const response = await fetch(`${GENIUS_API_BASE}/referents?song_id=${id}`, {
		headers: {
			Accept: 'application/json',
			Authorization: `Bearer ${token}`,
		},
		next: {
			revalidate: 86400,
		},
	})

	if (!response.ok) {
		throw new Error(
			`Genius song referents fetch failed with status ${response.status}`
		)
	}

	const payload = (await response.json()) as {
		response?: {
			referents?: Referent[]
		}
	}

	const referents = payload.response?.referents ?? []

	if (!referents) {
		throw new Error(
			'Genius song referents payload did not include referent data.'
		)
	}

	return referents
}
