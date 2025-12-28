import { NextResponse } from 'next/server'
import { fetchGeniusReferents } from '@/lib/genius'
import { prisma } from '@/lib/prisma'
import {
	cacheReferentsForSong,
	mapDbReferentsToNormalized,
	normalizeReferents,
} from '@/lib/referents'
import { isDbResourceStale } from '@/lib/refetch'
import type { NormalizedReferent } from '@/types'

type ReferentsResponse = {
	referents: NormalizedReferent[]
}

// GET /api/songs/[path]/referents - 获取歌曲 Genius annotations
export async function GET(
	_request: Request,
	context: { params: Promise<{ path: string }> },
) {
	try {
		const { path } = await context.params
		const geniusPath = `/${path}`

		// First find the song by path to get the songId
		const songRecord = await prisma.song.findUnique({
			where: { geniusPath },
			select: { id: true },
		})

		if (!songRecord) {
			return NextResponse.json({ error: 'Song not found' }, { status: 404 })
		}

		const songId = songRecord.id

		// Now get the full song record with referents
		const fullSongRecord = await prisma.song.findUnique({
			where: { id: songId },
			include: {
				referents: {
					include: {
						annotations: true,
					},
				},
			},
		})

		if (!fullSongRecord) {
			return NextResponse.json({ error: 'Song not found' }, { status: 404 })
		}

		let referents: NormalizedReferent[] = []
		const cachedReferents = fullSongRecord.referents ?? []
		const hasCachedReferents = cachedReferents.length > 0
		const needsRefresh = isDbResourceStale(
			fullSongRecord.referentsFetchedAt,
			'REFERENTS',
		)

		if (hasCachedReferents && !needsRefresh) {
			referents = mapDbReferentsToNormalized(cachedReferents)
		}

		const shouldFetch =
			fullSongRecord.geniusId && (!hasCachedReferents || needsRefresh)

		if (shouldFetch) {
			try {
				if (!fullSongRecord.geniusId) throw new Error('No geniusId')
				const referentsResponse = await fetchGeniusReferents(
					fullSongRecord.geniusId,
				)
				referents = normalizeReferents(referentsResponse)
				await cacheReferentsForSong(fullSongRecord.id, referents, {
					replaceExisting: Boolean(hasCachedReferents),
				})
			} catch (error) {
				console.error('Failed to fetch Genius referents', error)
				if (hasCachedReferents) {
					referents = mapDbReferentsToNormalized(cachedReferents)
				}
			}
		}

		const response: ReferentsResponse = {
			referents,
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error('Error fetching song referents:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		)
	}
}
