import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma/client'
import type {
	NormalizedReferent,
	NormalizedReferentAnnotation,
} from '@/lib/referents'

type DbReferentWithAnnotations = Prisma.ReferentGetPayload<{
	include: { annotations: true }
}>

export const mapDbReferentsToNormalized = (
	referents: DbReferentWithAnnotations[]
): NormalizedReferent[] => {
	return referents.map((referent) => ({
		id: referent.geniusId,
		fragment: referent.fragment,
		classification: referent.classification,
		rangeContent: referent.rangeContent ?? undefined,
		path: referent.path ?? '',
		url: referent.url ?? '',
		annotations: referent.annotations.map((annotation) => ({
			id: annotation.annotationId,
			body: annotation.body,
			url: annotation.url,
			votesTotal: annotation.votesTotal,
			authors: Array.isArray(annotation.authors)
				? (annotation.authors as NormalizedReferentAnnotation['authors'])
				: [],
			verified: annotation.verified,
			source: annotation.source,
		})),
	}))
}

export async function cacheReferentsForSong(
	songId: string,
	referents: NormalizedReferent[]
) {
	const deleteWhere =
		referents.length > 0
			? { songId, geniusId: { notIn: referents.map((referent) => referent.id) } }
			: { songId }

	const baseNow = new Date()

	await prisma.referent.deleteMany({
		where: deleteWhere,
	})

	for (const referent of referents) {
		const annotationRecords = referent.annotations.map((annotation) => ({
			annotationId: annotation.id,
			body: annotation.body,
			url: annotation.url,
			votesTotal: annotation.votesTotal,
			authors: annotation.authors.length > 0 ? annotation.authors : undefined,
			verified: annotation.verified,
			source: annotation.source ?? null,
		}))

		await prisma.referent.upsert({
			where: { geniusId: referent.id },
			create: {
				songId,
				geniusId: referent.id,
				fragment: referent.fragment,
				classification: referent.classification,
				rangeContent: referent.rangeContent ?? null,
				path: referent.path,
				url: referent.url,
				provider: 'genius',
				annotations: {
					create: annotationRecords,
				},
			},
			update: {
				fragment: referent.fragment,
				classification: referent.classification,
				rangeContent: referent.rangeContent ?? null,
				path: referent.path,
				url: referent.url,
				provider: 'genius',
				annotations: {
					deleteMany: {},
					create: annotationRecords,
				},
				updatedAt: baseNow,
			},
		})
	}

	await prisma.song.update({
		where: { id: songId },
		data: { referentsFetchedAt: baseNow },
	})
}
