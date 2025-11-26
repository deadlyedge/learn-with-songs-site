'use server'

import { prisma } from '@/lib/prisma'
import { ensureSongDetails } from '@/lib/song-details'
import { isDbResourceStale } from '@/lib/refetch'
import type { HeaderContents, GeniusSongInfo } from '@/types'
import type { Song } from '@/generated/prisma/client'

type SongDetailsResponse = {
	songId: string
	headerContents: HeaderContents
}

export async function getSongDetails(
	path: string
): Promise<SongDetailsResponse> {
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
		throw new Error('Song not found')
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

	return {
		songId: song.id,
		headerContents,
	}
}
