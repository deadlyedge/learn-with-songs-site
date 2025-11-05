import { NextRequest, NextResponse } from 'next/server'
import type { Song } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { searchGeniusSongs } from '@/lib/genius'

const parseQuery = (request: NextRequest) => {
	const url = new URL(request.url)
	return url.searchParams.get('q')?.trim() ?? ''
}

const toSongDto = (song: Song) => {
	return {
		id: song.id,
		title: song.title,
		artist: song.artist,
		album: song.album,
		releaseDate: song.releaseDate ? song.releaseDate.toISOString() : null,
		artworkUrl: song.artworkUrl,
		language: song.language,
		url: song.url,
	}
}

export async function GET(request: NextRequest) {
	const query = parseQuery(request)

	if (!query) {
		return NextResponse.json(
			{ error: 'Parameter `q` is required for searching songs.' },
			{ status: 400 },
		)
	}

	const dbSongs = await prisma.song.findMany({
		where: {
			OR: [
				{ title: { contains: query, mode: 'insensitive' } },
				{ artist: { contains: query, mode: 'insensitive' } },
			],
		},
		orderBy: {
			updatedAt: 'desc',
		},
		take: 10,
	})

	if (dbSongs.length > 0) {
		return NextResponse.json({
			source: 'database' as const,
			songs: dbSongs.map(toSongDto),
		})
	}

	try {
		const fallbackSongs = await searchGeniusSongs(query)

		if (fallbackSongs.length === 0) {
			return NextResponse.json({
				source: 'genius' as const,
				songs: [],
			})
		}

		const persisted = await Promise.all(
			fallbackSongs.slice(0, 10).map((song) => {
				const releaseDate = song.releaseDate ? new Date(song.releaseDate) : undefined
				const parsedReleaseDate =
					releaseDate && !Number.isNaN(releaseDate.getTime()) ? releaseDate : undefined

				return prisma.song.upsert({
					where: {
						geniusId: String(song.geniusId),
					},
					update: {
						title: song.title,
						artist: song.artist,
						album: song.album ?? null,
						releaseDate: parsedReleaseDate ?? null,
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
						releaseDate: parsedReleaseDate ?? null,
						artworkUrl: song.artworkUrl ?? null,
						language: song.language ?? null,
						url: song.url ?? null,
						geniusPath: song.path ?? null,
					},
				})
			}),
		)

		return NextResponse.json({
			source: 'genius' as const,
			songs: persisted.map(toSongDto),
		})
	} catch (error) {
		console.error(error)

		return NextResponse.json(
			{
				error: (error as Error).message ?? 'Failed to fetch songs from Genius.',
			},
			{ status: 502 },
		)
	}
}
