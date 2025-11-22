'use server'

import { prisma } from '@/lib/prisma'
import { fetchGeniusReferents } from '@/lib/genius'
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

export async function getSongReferents(songId: string): Promise<ReferentsResponse> {
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
		throw new Error('Song not found')
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
			if (!songRecord.geniusId) throw new Error('No geniusId')
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

	return {
		referents,
	}
}
