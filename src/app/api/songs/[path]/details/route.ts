import { NextResponse } from 'next/server'
import type { Song } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { isDbResourceStale } from '@/lib/refetch'
import { ensureSongDetails } from '@/lib/song-details'
import type { GeniusSongInfo, HeaderContents } from '@/types'

type SongDetailsResponse = {
	songId: string
	headerContents: HeaderContents
}

// GET /api/songs/[path]/details - 获取歌曲详情
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ path: string }> },
) {
	try {
		const { path } = await params
		const geniusPath = `/${path}`

		const songRecord = (await prisma.song.findUnique({
			where: { geniusPath },
			select: {
				id: true,
				geniusId: true,
				title: true,
				artist: true,
				album: true,
				language: true,
				url: true,
				artworkUrl: true,
				geniusPath: true,
				details: true,
				detailsFetchedAt: true,
			},
		})) as Song | null

		if (!songRecord) {
			return NextResponse.json({ error: 'Song not found' }, { status: 404 })
		}

		const shouldRefreshDetails = isDbResourceStale(
			songRecord.detailsFetchedAt,
			'SONG_DETAILS',
		)

		let song = songRecord

		if (shouldRefreshDetails) {
			try {
				const { song: syncedSong } = await ensureSongDetails(songRecord, {
					forceRefresh: true,
				})
				song = {
					...songRecord,
					...syncedSong,
				}
			} catch (error) {
				console.error('Failed to sync song details', error)
			}
		}

		const details = (song.details ?? null) as GeniusSongInfo | null
		const colorArray = [
			details?.song_art_primary_color || '#551122',
			details?.song_art_secondary_color || '#000',
		]

		const headerContents = {
			title: song.title,
			artist: song.artist,
			album: song.album as string,
			releaseDate: details?.release_date_for_display as string,
			description: details?.description as string,
			language: song.language as string,
			contributors: String(details?.stats?.contributors),
			pageviews: String(details?.stats?.pageviews),
			url: song.url as string,
			artworkUrl: song.artworkUrl as string,
			backgroundColor: colorArray,
		}

		const response: SongDetailsResponse = {
			songId: song.id,
			headerContents,
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error('Error fetching song details:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		)
	}
}
