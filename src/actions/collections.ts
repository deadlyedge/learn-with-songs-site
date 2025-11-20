'use server'

import { initialUser } from '@/lib/clerk-auth'
import {
	addSongToCollection,
	removeSongFromCollection,
	CollectionUnauthorizedError,
} from '@/lib/collections'
import { prisma } from '@/lib/prisma'
import type { CollectionSong } from '@/types'

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

export async function loadCollectionsForUser(userId: string) {
	const collections = await prisma.user
		.findUnique({
			where: { id: userId },
			include: {
				collections: {
					orderBy: { title: 'asc' },
				},
			},
		})
		.then((user) => user?.collections ?? [])

	return collections.map(mapCollectionSong)
}

export async function getUserCollectionsAction(): Promise<
	CollectionSong[] | null
> {
	const user = await initialUser()
	if (!user) {
		return null
	}

	return loadCollectionsForUser(user.id)
}

export async function addSongToUserCollectionsAction(songId: string) {
	const user = await initialUser()
	if (!user) {
		throw new CollectionUnauthorizedError('未登录')
	}

	await addSongToCollection(user.id, songId)
}

export async function removeSongFromUserCollectionsAction(songId: string) {
	const user = await initialUser()
	if (!user) {
		throw new CollectionUnauthorizedError('未登录')
	}

	await removeSongFromCollection(user.id, songId)
}
