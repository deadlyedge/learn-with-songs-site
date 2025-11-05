import { NextRequest, NextResponse } from 'next/server'
import type { Song, Lyric } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { fetchLyricsFromPath } from '@/lib/lyrics'

const toSongDetailDto = (song: Song, lyric: Lyric) => ({
	id: song.id,
	title: song.title,
	artist: song.artist,
	album: song.album,
	releaseDate: song.releaseDate ? song.releaseDate.toISOString() : null,
	artworkUrl: song.artworkUrl,
	language: song.language,
	url: song.url,
	lyrics: {
		content: lyric.content,
		provider: lyric.provider,
		fetchedAt: lyric.fetchedAt.toISOString(),
	},
})

type RouteContext = {
	params: {
		id: string
	}
}

export async function GET(_request: NextRequest, context: RouteContext) {
	const songId = context.params.id

	if (!songId) {
		return NextResponse.json({ error: 'Song id is required.' }, { status: 400 })
	}

	const song = await prisma.song.findUnique({
		where: {
			id: songId,
		},
		include: {
			lyrics: true,
		},
	})

	if (!song) {
		return NextResponse.json({ error: 'Song not found.' }, { status: 404 })
	}

	let lyricRecord = song.lyrics

	if (!lyricRecord) {
		if (!song.geniusPath) {
			return NextResponse.json(
				{ error: 'Lyrics are not available for this song yet.' },
				{ status: 404 },
			)
		}

		try {
			const lyrics = await fetchLyricsFromPath(song.geniusPath)

			lyricRecord = await prisma.lyric.upsert({
				where: {
					songId: song.id,
				},
				update: {
					content: lyrics,
					provider: 'lyrics.zick.me',
					fetchedAt: new Date(),
				},
				create: {
					songId: song.id,
					content: lyrics,
					provider: 'lyrics.zick.me',
				},
			})
		} catch (error) {
			console.error(error)
			return NextResponse.json(
				{ error: 'Failed to fetch lyrics from upstream service.' },
				{ status: 502 },
			)
		}
	}

	return NextResponse.json({
		song: toSongDetailDto(song, lyricRecord),
	})
}
