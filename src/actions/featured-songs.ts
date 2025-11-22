'use server'

import { prisma } from '@/lib/prisma'
import { cacheLife } from 'next/cache'
import type { Prisma } from '@/generated/prisma'
import type { GeniusSongInfo, FeaturedSong } from '@/types'

type SongWithDetails = Prisma.SongGetPayload<{
	select: {
		id: true
		title: true
		artist: true
		album: true
		artworkUrl: true
		geniusPath: true
		details: true
	}
}>
import {
	FEATURED_SONGS_RANDOM_SAMPLE_SIZE,
	FEATURED_SONGS_COUNT,
} from '@/constants'

/**
 * 检查歌曲是否具有有效的精选歌曲标准
 * @param song - 数据库中的歌曲记录
 * @returns 是否符合精选歌曲标准
 */
const isValidFeaturedSong = (song: SongWithDetails): boolean => {
	const details = song.details as GeniusSongInfo | null
	const pageviews = details?.stats?.pageviews

	return (
		Boolean(details) &&
		Boolean(song.geniusPath) &&
		typeof pageviews === 'number'
	)
}

/**
 * 将数据库歌曲记录转换为精选歌曲格式
 * @param song - 数据库中的有效歌曲记录（已通过过滤）
 * @returns 精选歌曲对象
 */
const mapSongToFeatured = (song: SongWithDetails): FeaturedSong => {
	const details = song.details as GeniusSongInfo
	const pageviews = details.stats?.pageviews ?? 0

	return {
		id: song.id,
		title: song.title,
		artist: song.artist,
		album: song.album ?? undefined,
		artworkUrl: song.artworkUrl ?? undefined,
		pageviews,
		geniusPath: song.geniusPath!,
	}
}

/**
 * 获取精选歌曲列表（具有缓存）
 * 从数据库中随机选择并按页面浏览量排序返回最受欢迎的歌曲
 * @returns 精选歌曲数组
 */
export async function getFeaturedSongs(): Promise<FeaturedSong[]> {
	'use cache'
	cacheLife('hours')

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

	// console.log('[Featured Songs Updated]')

	// 随机排序后取前6个，然后按页面浏览量降序排序
	return validSongs
		.sort(() => Math.random() - 0.5)
		.slice(0, FEATURED_SONGS_COUNT)
		.sort((a, b) => b.pageviews - a.pageviews)
}
