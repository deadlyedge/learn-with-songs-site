import { cache } from 'react'

import type { NormalizedReferent } from '@/lib/referents'
import { fetchFromApi } from './client'

export type HeaderContents = {
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
	backgroundColor: string[]
}

type SongDetailsResponse = {
	songId: string
	headerContents: HeaderContents
}

type LyricsResponse = {
	lyricLines: string[]
	lyricsError: string | null
}

type ReferentsResponse = {
	referents: NormalizedReferent[]
}

export const getSongDetails = cache(async (path: string) => {
	return fetchFromApi<SongDetailsResponse>(`/api/songs/details/${path}`)
})

export const getSongLyrics = cache(async (path: string) => {
	return fetchFromApi<LyricsResponse>(`/api/songs/lyrics/${path}`)
})

export const getSongReferents = cache(async (songId: string) => {
	return fetchFromApi<ReferentsResponse>(`/api/songs/referents/${songId}`)
})
