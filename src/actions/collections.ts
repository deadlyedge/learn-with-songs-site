'use server'

import { prisma } from '@/lib/prisma'
import { initialUser } from '@/lib/clerk-auth'
import type { CollectionSong } from '@/types'

// Constants
const ERROR_MESSAGES = {
	UNAUTHENTICATED: '未登录',
	SONG_NOT_FOUND: '歌曲不存在',
} as const

// Collection Errors
class CollectionError extends Error {}
class CollectionUnauthorizedError extends CollectionError {}
class CollectionNotFoundError extends CollectionError {}

// Helper Functions
const ensureLoggedInUser = async () => {
	const user = await initialUser()
	if (!user) {
		throw new CollectionUnauthorizedError(ERROR_MESSAGES.UNAUTHENTICATED)
	}
	return user
}

const validateSongExists = async (songId: string) => {
	const song = await prisma.song.findUnique({
		where: { id: songId },
		select: { id: true },
	})

	if (!song) {
		throw new CollectionNotFoundError(ERROR_MESSAGES.SONG_NOT_FOUND)
	}
}

const mapCollectionSong = (song: {
	id: string
	title: string
	artist: string
	album: string | null
	artworkUrl: string | null
	releaseDate: Date | null
	geniusPath: string | null
	url: string | null
}): CollectionSong => ({
	id: song.id,
	title: song.title,
	artist: song.artist,
	album: song.album,
	artworkUrl: song.artworkUrl,
	releaseDate: song.releaseDate ? song.releaseDate.toISOString() : null,
	geniusPath: song.geniusPath,
	url: song.url,
})

/**
 * 获取用户收藏的歌曲列表
 * @returns 用户收藏的歌曲数组，未登录则返回null
 * @throws CollectionUnauthorizedError 如果用户未授权
 */
export async function getUserCollectionsAction(): Promise<
	CollectionSong[] | null
> {
	const user = await ensureLoggedInUser()

	const collections = await prisma.user
		.findUnique({
			where: { id: user.id },
			include: {
				collections: {
					orderBy: { title: 'asc' },
				},
			},
		})
		.then((user) => user?.collections ?? [])

	return collections.map(mapCollectionSong)
}

/**
 * 将歌曲添加到用户收藏
 * @param songId - 歌曲ID
 * @throws CollectionUnauthorizedError 如果用户未登录
 * @throws CollectionNotFoundError 如果歌曲不存在
 */
export async function addSongToUserCollectionsAction(songId: string) {
	const user = await ensureLoggedInUser()
	await validateSongExists(songId)

	await prisma.user.update({
		where: { id: user.id },
		data: {
			collections: {
				connect: { id: songId },
			},
		},
	})
}

/**
 * 从用户收藏中移除歌曲
 * @param songId - 歌曲ID
 * @throws CollectionUnauthorizedError 如果用户未登录
 * @throws CollectionNotFoundError 如果歌曲不存在
 */
export async function removeSongFromUserCollectionsAction(songId: string) {
	const user = await ensureLoggedInUser()
	await validateSongExists(songId)

	await prisma.user.update({
		where: { id: user.id },
		data: {
			collections: {
				disconnect: { id: songId },
			},
		},
	})
}

/**
 * 检查歌曲是否已被用户收藏
 * @param songId - 歌曲ID
 * @returns 布尔值指示歌曲是否已收藏
 */
export async function isSongCollected(songId: string): Promise<boolean> {
	const user = await initialUser()
	if (!user) {
		return false
	}

	const count = await prisma.user.count({
		where: {
			id: user.id,
			collections: {
				some: { id: songId },
			},
		},
	})

	return count > 0
}
