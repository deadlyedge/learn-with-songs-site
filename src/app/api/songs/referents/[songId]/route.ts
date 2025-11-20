import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchGeniusReferents } from '@/lib/genius'
import {
	cacheReferentsForSong,
	mapDbReferentsToNormalized,
	normalizeReferents,
	type NormalizedReferent,
} from '@/lib/referents'
import { isDbResourceStale } from '@/lib/refetch'

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ songId: string }> }
) {
	const { songId } = await params

	try {
		const songRecord = await prisma.song.findUnique({
			where: { id: songId },
			include: {
				referents: {
					include: {
						annotations: true,
					},
				},
			},
		})

		if (!songRecord) {
			return NextResponse.json({ error: 'Song not found' }, { status: 404 })
		}

		let referents: NormalizedReferent[] = []
		const cachedReferents = songRecord.referents ?? []
		const hasCachedReferents = cachedReferents.length > 0
		const needsRefresh = isDbResourceStale(
			songRecord.referentsFetchedAt,
			'REFERENTS'
		)

		if (hasCachedReferents && !needsRefresh) {
			referents = mapDbReferentsToNormalized(cachedReferents)
		}

		const shouldFetch =
			songRecord.geniusId && (!hasCachedReferents || needsRefresh)

		if (shouldFetch) {
			try {
				if (!songRecord.geniusId) return NextResponse.json({ referents: [] })
				const referentsResponse = await fetchGeniusReferents(
					songRecord.geniusId
				)
				referents = normalizeReferents(referentsResponse)
				await cacheReferentsForSong(songRecord.id, referents, {
					replaceExisting: Boolean(hasCachedReferents),
				})
			} catch (error) {
				console.error('Failed to fetch Genius referents', error)
				if (hasCachedReferents) {
					referents = mapDbReferentsToNormalized(cachedReferents)
				}
			}
		}

		return NextResponse.json({
			referents,
		})
	} catch (error) {
		console.error('Failed to fetch referents:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}
