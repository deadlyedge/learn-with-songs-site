import { prisma } from '@/lib/prisma'

export class CollectionError extends Error {}
export class CollectionUnauthorizedError extends CollectionError {}
export class CollectionNotFoundError extends CollectionError {}

export const addSongToCollection = async (userId: string, songId: string) => {
	const song = await prisma.song.findUnique({
		where: { id: songId },
		select: { id: true },
	})

	if (!song) {
		throw new CollectionNotFoundError('歌曲不存在')
	}

	await prisma.user.update({
		where: { id: userId },
		data: {
			collections: {
				connect: { id: songId },
			},
		},
	})
}

export const removeSongFromCollection = async (
	userId: string,
	songId: string,
) => {
	const song = await prisma.song.findUnique({
		where: { id: songId },
		select: { id: true },
	})

	if (!song) {
		throw new CollectionNotFoundError('歌曲不存在')
	}

	await prisma.user.update({
		where: { id: userId },
		data: {
			collections: {
				disconnect: { id: songId },
			},
		},
	})
}

export const isSongCollectedByUserId = async (
	userId: string,
	songId: string,
) => {
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
