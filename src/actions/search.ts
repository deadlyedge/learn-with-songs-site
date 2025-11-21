'use server'

import type { Song } from '@/generated/prisma/client'
import type { NormalizedSong } from '@/types'
import { prisma } from '@/lib/prisma'
import { searchGeniusSongs } from '@/lib/genius'

const toSongDTO = (song: Song) => ({
	id: song.id,
	title: song.title,
	artist: song.artist,
	album: song.album,
	releaseDate: song.releaseDate ? song.releaseDate.toISOString() : null,
	artworkUrl: song.artworkUrl,
	language: song.language,
	url: song.url,
	path: song.geniusPath,
})

const parseReleaseDate = (value?: string | null) => {
	if (!value) {
		return null
	}

	const parsed = new Date(value)
	return Number.isNaN(parsed.getTime()) ? null : parsed
}

const upsertNormalizedSong = (song: NormalizedSong) => {
	const parsedReleaseDate = parseReleaseDate(song.releaseDate)

	return prisma.song.upsert({
		where: {
			geniusId: String(song.geniusId),
		},
		update: {
			title: song.title,
			artist: song.artist,
			album: song.album ?? null,
			releaseDate: parsedReleaseDate,
			artworkUrl: song.artworkUrl ?? null,
			language: song.language ?? null,
			url: song.url ?? null,
			geniusPath: song.path ?? null,
		},
		create: {
			geniusId: String(song.geniusId),
			title: song.title,
			artist: song.artist,
			album: song.album ?? null,
			releaseDate: parsedReleaseDate,
			artworkUrl: song.artworkUrl ?? null,
			language: song.language ?? null,
			url: song.url ?? null,
			geniusPath: song.path ?? null,
		},
	})
}

export type SearchSong = ReturnType<typeof toSongDTO>
export type SongSource = 'database' | 'genius' | 'mixed'

export type SongSearchResponse = {
	source: SongSource
	songs: SearchSong[]
	canSearchGenius: boolean
	performedGenius: boolean
	autoContinued: boolean
}

type SearchParams = {
	query: string
	source?: string | null
}

export async function searchSongs({ query, source }: SearchParams) {
	if (!query) {
		throw new Error('Parameter `q` is required for searching songs.')
	}

	const forceGenius = source === 'genius'
	const dbSongs = await prisma.song.findMany({
		where: {
			OR: [
				{ title: { contains: query, mode: 'insensitive' } },
				{ artist: { contains: query, mode: 'insensitive' } },
			],
		},
		orderBy: {
			releaseDate: 'asc',
		},
		take: 10,
	})

	const songs: Song[] = []
	const seen = new Set<string>()

	for (const song of dbSongs) {
		if (!seen.has(song.id)) {
			seen.add(song.id)
			songs.push(song)
		}
	}

	const needsGenius = forceGenius || dbSongs.length < 3
	let performedGenius = false
	let autoContinued = false

	if (needsGenius) {
		const fallbackSongs = await searchGeniusSongs(query)

		console.log('[Genius Search] ', query)

		if (fallbackSongs.length > 0) {
			performedGenius = true
			autoContinued = !forceGenius && dbSongs.length > 0 && dbSongs.length < 3

			const persisted = await Promise.all(
				fallbackSongs.slice(0, 10).map((song) => upsertNormalizedSong(song))
			)

			for (const song of persisted) {
				if (!seen.has(song.id)) {
					seen.add(song.id)
					songs.push(song)
				}
			}
		}
	}

	let responseSource: SongSearchResponse['source']

	if (performedGenius && dbSongs.length > 0) {
		responseSource = 'mixed'
	} else if (performedGenius || forceGenius) {
		responseSource = 'genius'
	} else if (dbSongs.length > 0) {
		responseSource = 'database'
	} else {
		responseSource = 'genius'
	}

	return {
		source: responseSource,
		songs: songs.map(toSongDTO),
		canSearchGenius: !forceGenius,
		performedGenius,
		autoContinued,
	}
}
