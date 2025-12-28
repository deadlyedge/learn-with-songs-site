import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { initialUser } from '@/lib/clerk-auth'
import type { CollectionSong } from '@/types'

// Constants
const ERROR_MESSAGES = {
	UNAUTHENTICATED: '未登录',
	SONG_NOT_FOUND: '歌曲不存在',
} as const

// Helper functions
const ensureLoggedInUser = async () => {
	const user = await initialUser()
	if (!user) {
		throw new Error(ERROR_MESSAGES.UNAUTHENTICATED)
	}
	return user
}

const validateSongExists = async (songId: string) => {
	const song = await prisma.song.findUnique({
		where: { id: songId },
		select: { id: true },
	})

	if (!song) {
		throw new Error(ERROR_MESSAGES.SONG_NOT_FOUND)
	}
}

const mapCollectionSong = (song: any): CollectionSong => ({
	id: song.id,
	title: song.title,
	artist: song.artist,
	album: song.album,
	artworkUrl: song.artworkUrl,
	releaseDate: song.releaseDate ? song.releaseDate.toISOString() : null,
	geniusPath: song.geniusPath,
	url: song.url,
})

// GET /api/collections - 获取用户收藏的歌曲列表
export async function GET() {
	try {
		const user = await ensureLoggedInUser()

		const userWithCollections = await prisma.user.findUnique({
			where: { id: user.id },
			include: {
				collections: {
					orderBy: { title: 'asc' },
					select: {
						id: true,
						title: true,
						artist: true,
						album: true,
						artworkUrl: true,
						releaseDate: true,
						geniusPath: true,
						url: true,
					},
				},
			},
		})

		const collections = userWithCollections?.collections ?? []
		const mappedCollections = collections.map(mapCollectionSong)

		return NextResponse.json({ collections: mappedCollections })
	} catch (error) {
		console.error('Error fetching collections:', error)
		const status = error instanceof Error && error.message === ERROR_MESSAGES.UNAUTHENTICATED ? 401 : 500
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Internal server error' },
			{ status }
		)
	}
}

// POST /api/collections - 将歌曲添加到用户收藏
export async function POST(request: NextRequest) {
	try {
		const user = await ensureLoggedInUser()
		const { songId } = await request.json()

		if (!songId || typeof songId !== 'string') {
			return NextResponse.json({ error: 'Song ID is required' }, { status: 400 })
		}

		await validateSongExists(songId)

		await prisma.user.update({
			where: { id: user.id },
			data: {
				collections: {
					connect: { id: songId },
				},
			},
		})

		return NextResponse.json({ success: true })
	} catch (error) {
		console.error('Error adding to collection:', error)
		const status = error instanceof Error && error.message === ERROR_MESSAGES.UNAUTHENTICATED ? 401 : 500
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Internal server error' },
			{ status }
		)
	}
}
