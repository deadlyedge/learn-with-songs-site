'use server'

import { cache } from 'react'

import { prisma } from '@/lib/prisma'
import type { FeaturedSong } from '@/types'
import type { GeniusSongInfo } from '@/types/songsAPI'

const buildFeaturedSongs = cache(async (): Promise<FeaturedSong[]> => {
	const songs = await prisma.song.findMany({
		where: {
			lyrics: {
				isNot: null,
			},
		},
		select: {
			id: true,
			title: true,
			artist: true,
			album: true,
			artworkUrl: true,
			geniusPath: true,
			details: true,
		},
		take: 20,
	})

	return songs
		.filter((song) => {
			const details = (song.details ?? null) as GeniusSongInfo | null
			const pageviews = details?.stats?.pageviews
			return (
				Boolean(details) &&
				Boolean(song.geniusPath) &&
				typeof pageviews === 'number'
			)
		})
		.map((song) => {
			const details = song.details! as GeniusSongInfo
			const pageviews = details.stats!.pageviews!
			return {
				id: song.id,
				title: song.title,
				artist: song.artist,
				album: song.album ?? undefined,
				artworkUrl: song.artworkUrl ?? undefined,
				pageviews,
				geniusPath: song.geniusPath!,
			}
		})
		.sort(() => Math.random() - 0.5)
		.slice(0, 6)
		.sort((a, b) => b.pageviews - a.pageviews)
})

export async function getFeaturedSongsAction() {
	return buildFeaturedSongs()
}

export async function loadFeaturedSongs() {
	return buildFeaturedSongs()
}
