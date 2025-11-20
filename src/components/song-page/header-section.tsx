import { unstable_cache } from 'next/cache'
import { Header } from './header'
import { initialUser } from '@/lib/clerk-auth'
import { isSongCollectedByUserId } from '@/lib/collections'

type HeaderContents = {
	title: string
	artist: string
	album: string
	releaseDate: string
	description: string
	language: string
	contributors: string
	pageviews: string
	url: string
	artworkUrl: string
	backgroundColor: string[] //[number, number, number]
}

async function fetchSongDetails(path: string) {
	const response = await fetch(
		`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/songs/details/${path}`,
		{
			next: { revalidate: 86400 }, // 1 day cache
		}
	)

	if (!response.ok) {
		if (response.status === 404) {
			throw new Error('Song not found')
		}
		throw new Error('Failed to fetch song details')
	}

	return response.json()
}

const cachedFetchSongDetails = unstable_cache(
	fetchSongDetails,
	['song-details'],
	{ revalidate: 86400 }
)

type DetailsData = {
	songId: string
	headerContents: HeaderContents
}

export async function HeaderSection({ path }: { path: string }) {
	const data: DetailsData = await cachedFetchSongDetails(path)
	const user = await initialUser()
	const isCollected =
		user && data.songId
			? await isSongCollectedByUserId(user.id, data.songId)
			: false

	return (
		<Header
			headerContents={data.headerContents}
			songId={data.songId}
			isCollected={isCollected}
		/>
	)
}
