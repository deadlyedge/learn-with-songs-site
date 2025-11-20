import { cache } from 'react'
import { cookies } from 'next/headers'

import type { CollectionSong, FeaturedSong } from '@/types'
import { fetchFromApi, ApiError } from './client'
import { auth } from '@clerk/nextjs/server'

type FeaturedSongsResponse = {
	songs: FeaturedSong[]
}

type UserCollectionsResponse = {
	collections: CollectionSong[]
}

export const getFeaturedSongs = cache(async () => {
	const data = await fetchFromApi<FeaturedSongsResponse>('/api/featured-songs')
	return data.songs
})

export async function getUserCollections() {
	const { userId } = await auth()
	if (!userId) return null

	try {
		const cookieHeader = (await cookies()).toString()
		const headers = cookieHeader ? { cookie: cookieHeader } : undefined
		const data = await fetchFromApi<UserCollectionsResponse>(
			'/api/collections',
			{
				cache: 'no-store',
				headers,
			}
		)
		return data.collections
	} catch (error) {
		if (error instanceof ApiError && error.status === 401) {
			return null
		}
		throw error
	}
}
