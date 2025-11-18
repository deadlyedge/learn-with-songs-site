import { unstable_cache } from 'next/cache'
import { Annotations } from './annotations'
import type { NormalizedReferent } from '@/lib/referents'

async function fetchSongReferents(songId: string) {
	const response = await fetch(
		`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/songs/referents/${songId}`,
		{
			next: { revalidate: 604800 }, // 7 days cache - annotations are stable
		}
	)

	if (!response.ok) {
		if (response.status === 404) {
			throw new Error('Song not found')
		}
		throw new Error('Failed to fetch referents')
	}

	return response.json()
}

const cachedFetchSongReferents = unstable_cache(
	fetchSongReferents,
	['song-referents'],
	{ revalidate: 604800 }
)

type ReferentsData = {
	referents: NormalizedReferent[]
}

export async function AnnotationsSection({ songId }: { songId?: string }) {
	if (!songId) {
		return <Annotations referents={[]} />
	}

	const data: ReferentsData = await cachedFetchSongReferents(songId)

	return <Annotations referents={data.referents} />
}
