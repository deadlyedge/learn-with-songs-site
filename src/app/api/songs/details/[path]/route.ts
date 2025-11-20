import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureSongDetails } from '@/lib/song-details'
import { isDbResourceStale } from '@/lib/refetch'
// import { hexToRgb01 } from '@/lib/utils'
import type { GeniusSongInfo } from '@/types/songsAPI'

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ path: string }> }
) {
	const { path } = await params

	try {
		const geniusPath = `/${path}`
		const songRecord = await prisma.song.findUnique({
			where: { geniusPath },
		})

		if (!songRecord) {
			return NextResponse.json({ error: 'Song not found' }, { status: 404 })
		}

		const shouldRefreshDetails = isDbResourceStale(
			songRecord.detailsFetchedAt,
			'SONG_DETAILS'
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
		// const colorArray = details?.song_art_primary_color
		// 	? hexToRgb01(details.song_art_primary_color)
		// 	: ([0.5, 0.1, 0.2] as [number, number, number])
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

		return NextResponse.json({
			songId: song.id,
			headerContents,
		})
	} catch (error) {
		console.error('Failed to fetch song details:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}
