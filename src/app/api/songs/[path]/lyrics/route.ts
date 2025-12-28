import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchLyricsFromPath } from '@/lib/lyrics'
import { splitLyrics } from '@/lib/utils'
import { isDbResourceStale } from '@/lib/refetch'

type LyricsResponse = {
	lyricLines: string[]
	lyricsError: string | null
}

// GET /api/songs/[path]/lyrics - 获取歌曲歌词
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ path: string }> }
) {
	try {
		const { path } = await params
		const geniusPath = `/${path}`

		const songRecord = await prisma.song.findUnique({
			where: { geniusPath },
			include: {
				lyrics: true,
			},
		})

		if (!songRecord) {
			return NextResponse.json(
				{ error: 'Song not found' },
				{ status: 404 }
			)
		}

		let lyricRecord = songRecord.lyrics
		let lyricsError: string | null = null

		const needsRefresh =
			!lyricRecord ||
			isDbResourceStale(lyricRecord.updatedAt, 'LYRICS') ||
			!lyricRecord.content?.trim()

		if (needsRefresh) {
			try {
				const fetchedLyrics = await fetchLyricsFromPath(geniusPath)
				lyricRecord = await prisma.lyric.upsert({
					where: { songId: songRecord.id },
					update: {
						content: fetchedLyrics,
						provider: 'lyrics.zick.me',
						updatedAt: new Date(),
					},
					create: {
						songId: songRecord.id,
						content: fetchedLyrics,
						provider: 'lyrics.zick.me',
					},
				})
			} catch (error) {
				console.error('Failed to fetch lyrics', error)
				lyricsError = '歌词获取失败，请稍后重试。'
			}
		}

		const lyricLines = lyricRecord ? splitLyrics(lyricRecord.content) : []

		const response: LyricsResponse = {
			lyricLines,
			lyricsError,
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error('Error fetching song lyrics:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}
