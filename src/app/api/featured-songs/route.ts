import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { FeaturedSong } from '@/types'

// Constants
const FEATURED_SONGS_RANDOM_SAMPLE_SIZE = 100
const FEATURED_SONGS_COUNT = 6

/**
 * 检查歌曲是否具有有效的精选歌曲标准
 */
const isValidFeaturedSong = (song: any): boolean => {
	const details = song.details
	const pageviews = details?.stats?.pageviews

	return (
		Boolean(details) &&
		Boolean(song.geniusPath) &&
		typeof pageviews === 'number'
	)
}

/**
 * 将数据库歌曲记录转换为精选歌曲格式
 */
const mapSongToFeatured = (song: any): FeaturedSong => {
	const details = song.details
	const pageviews = details.stats?.pageviews ?? 0

	return {
		id: song.id,
		title: song.title,
		artist: song.artist,
		album: song.album ?? undefined,
		artworkUrl: song.artworkUrl ?? undefined,
		pageviews,
		geniusPath: song.geniusPath,
	}
}

// GET /api/featured-songs - 获取精选歌曲列表
export async function GET() {
	try {
		const songs = await prisma.song.findMany({
			where: {
				lyrics: { isNot: null },
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
			take: FEATURED_SONGS_RANDOM_SAMPLE_SIZE,
		})

		// 过滤有效歌曲并转换为精选格式
		const validSongs = songs.filter(isValidFeaturedSong).map(mapSongToFeatured)

		// 随机排序后取前6个，然后按页面浏览量降序排序
		const featuredSongs = validSongs
			.sort(() => Math.random() - 0.5)
			.slice(0, FEATURED_SONGS_COUNT)
			.sort((a, b) => b.pageviews - a.pageviews)

		return NextResponse.json({ featuredSongs })
	} catch (error) {
		console.error('Error fetching featured songs:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}
