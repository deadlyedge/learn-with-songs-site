'use server'

import { initialUser } from '@/lib/clerk-auth'
// import {
// 	addSongToCollection,
// 	removeSongFromCollection,
// } from '@/lib/collections'
import { prisma } from '@/lib/prisma'
import type { CollectionSong } from '@/types'

class CollectionError extends Error {}
class CollectionUnauthorizedError extends CollectionError {}
class CollectionNotFoundError extends CollectionError {}

const mapCollectionSong = (song: {
	id: string
	title: string
	artist: string
	album: string | null
	artworkUrl: string | null
	releaseDate: Date | null
	geniusPath: string | null
	url: string | null
}) => ({
	id: song.id,
	title: song.title,
	artist: song.artist,
	album: song.album,
	artworkUrl: song.artworkUrl,
	releaseDate: song.releaseDate ? song.releaseDate.toISOString() : null,
	geniusPath: song.geniusPath,
	url: song.url,
})

// export async function loadCollectionsForUser(userId: string) {
// 	const collections = await prisma.user
// 		.findUnique({
// 			where: { id: userId },
// 			include: {
// 				collections: {
// 					orderBy: { title: 'asc' },
// 				},
// 			},
// 		})
// 		.then((user) => user?.collections ?? [])

// 	return collections.map(mapCollectionSong)
// }

export async function getUserCollectionsAction(): Promise<
	CollectionSong[] | null
> {
	const user = await initialUser()
	if (!user) {
		throw new CollectionUnauthorizedError('未登录')
	}

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

export async function addSongToUserCollectionsAction(songId: string) {
	const user = await initialUser()
	if (!user) {
		throw new CollectionUnauthorizedError('未登录')
	}

	const song = await prisma.song.findUnique({
		where: { id: songId },
		select: { id: true },
	})

	if (!song) {
		throw new CollectionNotFoundError('歌曲不存在')
	}

	await prisma.user.update({
		where: { id: user.id },
		data: {
			collections: {
				connect: { id: songId },
			},
		},
	})
}

export async function removeSongFromUserCollectionsAction(songId: string) {
	const user = await initialUser()
	if (!user) {
		throw new CollectionUnauthorizedError('未登录')
	}

	const song = await prisma.song.findUnique({
		where: { id: songId },
		select: { id: true },
	})

	if (!song) {
		throw new CollectionNotFoundError('歌曲不存在')
	}

	await prisma.user.update({
		where: { id: user.id },
		data: {
			collections: {
				disconnect: { id: songId },
			},
		},
	})
}

export async function isSongCollectedByUserId(userId: string, songId: string) {
	// const user = await initialUser()
	// if (!user) {
	// 	throw new CollectionUnauthorizedError('未登录')
	// }

	const count = await prisma.user.count({
		where: {
			id: userId,
			collections: {
				some: {
					id: songId,
				},
			},
		},
	})

	return count > 0
}
