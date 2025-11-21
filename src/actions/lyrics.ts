'use server'

import { prisma } from '@/lib/prisma'
import { fetchLyricsFromPath } from '@/lib/lyrics'
import { splitLyrics } from '@/lib/utils'
import { isDbResourceStale } from '@/lib/refetch'

type LyricsResponse = {
	lyricLines: string[]
	lyricsError: string | null
}

export async function getSongLyrics(path: string): Promise<LyricsResponse> {
	const geniusPath = `/${path}`
	const songRecord = await prisma.song.findUnique({
		where: { geniusPath },
		include: {
			lyrics: true,
		},
	})

	if (!songRecord) {
		throw new Error('Song not found')
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
			lyricsError = '歌词获取失败，请稍后重试。'
		}
	}

	const lyricLines = lyricRecord ? splitLyrics(lyricRecord.content) : []

	return {
		lyricLines,
		lyricsError,
	}
}
