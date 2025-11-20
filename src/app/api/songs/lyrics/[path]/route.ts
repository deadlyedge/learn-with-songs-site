import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { fetchLyricsFromPath } from '@/lib/lyrics'
import { splitLyrics } from '@/lib/utils'
import { isDbResourceStale } from '@/lib/refetch'

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ path: string }> }
) {
	const { path } = await params

	try {
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
			!lyricRecord || isDbResourceStale(lyricRecord.updatedAt, 'LYRICS')

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
				lyricsError = '�����ȡʧ�ܣ����Ժ����ԡ�'
			}
		}

		const lyricLines = lyricRecord ? splitLyrics(lyricRecord.content) : []

		return NextResponse.json({
			lyricLines,
			lyricsError,
		})
	} catch (error) {
		console.error('Failed to fetch lyrics:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}

