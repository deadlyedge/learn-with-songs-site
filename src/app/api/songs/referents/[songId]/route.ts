import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchGeniusReferents } from '@/lib/genius'
import {
	cacheReferentsForSong,
	mapDbReferentsToNormalized,
	normalizeReferents,
	type NormalizedReferent,
} from '@/lib/referents'

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
			return NextResponse.json(
				{ error: 'Song not found' },
				{ status: 404 }
			)
		}

		let referents: NormalizedReferent[] = []
		const cachedReferents = songRecord.referents ?? []
		const hasCachedReferents = cachedReferents.length > 0
		const hasFetchedReferents = Boolean(songRecord.referentsFetchedAt)

		if (hasCachedReferents) {
			referents = mapDbReferentsToNormalized(cachedReferents)
		} else if (songRecord.geniusId && !hasFetchedReferents) {
			try {
				const referentsResponse = await fetchGeniusReferents(songRecord.geniusId)
				referents = normalizeReferents(referentsResponse)
				await cacheReferentsForSong(songRecord.id, referents)
			} catch (error) {
				console.error('Failed to fetch Genius referents', error)
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
