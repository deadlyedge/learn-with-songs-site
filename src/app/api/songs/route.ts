import { NextRequest, NextResponse } from 'next/server'
import type { Song } from '@/generated/prisma/client'
import type { NormalizedSong } from '@/types'
import { prisma } from '@/lib/prisma'
import { searchGeniusSongs } from '@/lib/genius'

const parseSearchParams = (request: NextRequest) => {
	const url = new URL(request.url)
	const requestedSource =
		url.searchParams.get('source')?.trim().toLowerCase() ?? null

	return {
		query: url.searchParams.get('q')?.trim() ?? '',
		requestedSource,
	}
}

const toSongDTO = (song: Song) => {
	return {
		id: song.id,
		title: song.title,
		artist: song.artist,
		album: song.album,
		releaseDate: song.releaseDate ? song.releaseDate.toISOString() : null,
		artworkUrl: song.artworkUrl,
		language: song.language,
		url: song.url,
		path: song.geniusPath,
	}
}

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

export async function GET(request: NextRequest) {
	const { query, requestedSource } = parseSearchParams(request)

	if (!query) {
		return NextResponse.json(
			{ error: 'Parameter `q` is required for searching songs.' },
			{ status: 400 }
		)
	}

	const forceGenius = requestedSource === 'genius'
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
		try {
			const fallbackSongs = await searchGeniusSongs(query)

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
		} catch (error) {
			console.error(error)

			return NextResponse.json(
				{
					error:
						(error as Error).message ?? 'Failed to fetch songs from Genius.',
				},
				{ status: 502 }
			)
		}
	}

	let source: 'database' | 'genius' | 'mixed'

	if (performedGenius && dbSongs.length > 0) {
		source = 'mixed'
	} else if (performedGenius || forceGenius) {
		source = 'genius'
	} else if (dbSongs.length > 0) {
		source = 'database'
	} else {
		source = 'genius'
	}

	return NextResponse.json({
		source,
		songs: songs.map(toSongDTO),
		canSearchGenius: !forceGenius,
		performedGenius,
		autoContinued,
	})
}
