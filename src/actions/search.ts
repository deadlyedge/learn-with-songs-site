'use server'

import { prisma } from '@/lib/prisma'
import { searchGeniusSongs } from '@/lib/genius'
import type { Prisma } from '@/generated/prisma'
import {
	GeniusSongResponse,
	SongSearchResult,
	SongSearchResponse,
	SearchSongDTO,
} from '@/types'

import {
	CACHE_TTL_MS,
	MIN_CACHE_RESULTS,
	SIMILARITY_HIGH_THRESHOLD,
	SIMILARITY_LOW_THRESHOLD,
} from '@/constants'

type CacheConfidence = 'high' | 'medium' | 'low' | null
type CacheResult = {
	songs: SearchSongDTO[]
	confidence: CacheConfidence
}

type SongWithSimilarity = SongSearchResult & {
	similarity: number
}

const normalizeQuery = (value: string) => value.trim().toLowerCase()

const selectFields = {
	id: true,
	title: true,
	artist: true,
	album: true,
	geniusPath: true,
	releaseDate: true,
	artworkUrl: true,
	language: true,
	url: true,
}

const executeLocalSearch = (where: Prisma.SongWhereInput, take: number) =>
	prisma.song.findMany({
		where,
		select: selectFields,
		take,
		orderBy: { releaseDate: 'asc' },
	})

const searchBySimilarity = async (
	query: string,
	take: number
): Promise<SongWithSimilarity[]> => {
	const raw = await prisma.$queryRaw<SongWithSimilarity[]>`
		SELECT
			"id",
			"title",
			"artist",
			"album",
			"geniusPath",
			"releaseDate",
			"artworkUrl",
			"language",
			"url",
			GREATEST(similarity("title", ${query}), similarity("artist", ${query})) AS similarity
		FROM "Song"
		WHERE similarity("title", ${query}) > ${SIMILARITY_LOW_THRESHOLD}
			OR similarity("artist", ${query}) > ${SIMILARITY_LOW_THRESHOLD}
		ORDER BY similarity DESC
		LIMIT ${take}
	`

	return raw
}

const determineConfidence = (
	highMatches: number,
	mediumMatches: number,
	totalMatches: number
): CacheConfidence => {
	if (highMatches >= 3) {
		return 'high'
	}
	if (highMatches > 0 || mediumMatches >= 2 || totalMatches >= 4) {
		return 'medium'
	}
	return 'low'
}

const fetchCachedSearchResults = async (
	normalizedQuery: string
): Promise<CacheResult | null> => {
	if (!normalizedQuery) {
		return null
	}

	const cacheEntry = await prisma.searchCache.findUnique({
		where: { query: normalizedQuery },
	})

	if (!cacheEntry) {
		return null
	}

	const age = Date.now() - cacheEntry.updatedAt.getTime()
	if (age > CACHE_TTL_MS) {
		return null
	}

	if (!Array.isArray(cacheEntry.songs)) {
		return null
	}

	const confidence = cacheEntry.confidence as CacheConfidence
	if (!confidence || confidence === 'low') {
		return null
	}

	return {
		songs: cacheEntry.songs as SearchSongDTO[],
		confidence,
	}
}

const cacheSearchResults = async (
	normalizedQuery: string,
	songs: SearchSongDTO[],
	confidence: CacheConfidence
) => {
	if (!normalizedQuery || songs.length === 0 || confidence === 'low') {
		return
	}

	await prisma.searchCache.upsert({
		where: { query: normalizedQuery },
		create: { query: normalizedQuery, songs, confidence },
		update: { songs, confidence },
	})
}

const toSearchSongDTO = (song: SongSearchResult): SearchSongDTO => ({
	id: song.id,
	title: song.title,
	artist: song.artist,
	album: song.album,
	releaseDate: song.releaseDate ? song.releaseDate.toISOString() : null,
	artworkUrl: song.artworkUrl,
	language: song.language,
	url: song.url,
	path: song.geniusPath,
})

const parseReleaseDate = (value?: string | null) => {
	if (!value) {
		return null
	}

	const parsed = new Date(value)
	return Number.isNaN(parsed.getTime()) ? null : parsed
}

const upsertNormalizedSong = (song: GeniusSongResponse) => {
	const parsedReleaseDate = parseReleaseDate(song.releaseDate)

	return prisma.song.upsert({
		where: {
			geniusId: String(song.geniusId),
		},
		update: {
			title: song.title,
			artist: song.artist,
			album: song.album ?? null,
			releaseDate: parsedReleaseDate,
			artworkUrl: song.artworkUrl ?? null,
			language: song.language ?? null,
			url: song.url ?? null,
			geniusPath: song.path ?? null,
		},
		create: {
			geniusId: String(song.geniusId),
			title: song.title,
			artist: song.artist,
			album: song.album ?? null,
			releaseDate: parsedReleaseDate,
			artworkUrl: song.artworkUrl ?? null,
			language: song.language ?? null,
			url: song.url ?? null,
			geniusPath: song.path ?? null,
		},
		select: selectFields,
	})
}

export async function searchSongs({
	query,
	source,
}: {
	query: string
	source?: string | null
}): Promise<SongSearchResponse> {
	if (!query) {
		throw new Error('Parameter `q` is required for searching songs.')
	}

	const trimmedQuery = query.trim()
	if (!trimmedQuery) {
		throw new Error('Parameter `q` is required for searching songs.')
	}

	const normalizedQuery = normalizeQuery(trimmedQuery)
	const forceGenius = source === 'genius'

	if (!forceGenius) {
		const cachedSearch = await fetchCachedSearchResults(normalizedQuery)
		if (cachedSearch && cachedSearch.songs.length >= MIN_CACHE_RESULTS) {
			return {
				source: 'cache',
				songs: cachedSearch.songs,
				canSearchGenius: !forceGenius,
				performedGenius: false,
				autoContinued: false,
			}
		}
	}

	const normalizedWords = trimmedQuery
		.split(/\s+/)
		.map((word) => word.trim())
		.filter((word) => word.length >= 3)

	const mediumConfidenceWhere: Prisma.SongWhereInput = {
		OR: [
			{ title: { contains: trimmedQuery, mode: 'insensitive' } },
			{ artist: { contains: trimmedQuery, mode: 'insensitive' } },
		],
	}

	const lowConfidenceWhere: Prisma.SongWhereInput | null =
		normalizedWords.length > 0
			? {
					OR: normalizedWords.flatMap((word) => [
						{ title: { contains: word, mode: 'insensitive' } },
						{ artist: { contains: word, mode: 'insensitive' } },
					]),
			  }
			: null

	const songs: SongSearchResult[] = []
	const seen = new Set<string>()

	const appendUnique = (items: SongSearchResult[]) => {
		const added: SongSearchResult[] = []
		for (const song of items) {
			if (seen.has(song.id)) {
				continue
			}
			seen.add(song.id)
			added.push(song)
			songs.push(song)
			if (songs.length >= 10) {
				break
			}
		}
		return added
	}

	const similarityMatches = await searchBySimilarity(trimmedQuery, 6)
	const similarityHighCount = similarityMatches.filter(
		(item) => item.similarity >= SIMILARITY_HIGH_THRESHOLD
	).length
	const similarityMediumCount = similarityMatches.filter(
		(item) =>
			item.similarity >= SIMILARITY_LOW_THRESHOLD &&
			item.similarity < SIMILARITY_HIGH_THRESHOLD
	).length

	appendUnique(similarityMatches)

	const mediumMatches = await executeLocalSearch(mediumConfidenceWhere, 6)
	const lowMatches =
		lowConfidenceWhere !== null
			? await executeLocalSearch(lowConfidenceWhere, 6)
			: []

	if (songs.length < 10) {
		appendUnique(mediumMatches)
	}
	if (songs.length < 10) {
		appendUnique(lowMatches)
	}

	const confidence = determineConfidence(
		similarityHighCount,
		similarityMediumCount,
		songs.length
	)
	const shouldCallGenius = forceGenius || confidence === 'low'

	let performedGenius = false
	let autoContinued = false

	if (!shouldCallGenius) {
		const songDTOs = songs.map(toSearchSongDTO)
		await cacheSearchResults(normalizedQuery, songDTOs, confidence)

		return {
			source: 'database',
			songs: songDTOs,
			canSearchGenius: !forceGenius,
			performedGenius: false,
			autoContinued: false,
		}
	}

	const fallbackSongs: GeniusSongResponse[] = await searchGeniusSongs(
		trimmedQuery
	)

	if (fallbackSongs.length > 0) {
		console.log('[Genius Search] ', trimmedQuery)
		performedGenius = true
		autoContinued = !forceGenius && songs.length > 0

		const persisted: SongSearchResult[] = await Promise.all(
			fallbackSongs.slice(0, 10).map((song) => upsertNormalizedSong(song))
		)

		appendUnique(persisted)
	}

	let responseSource: SongSearchResponse['source']

	if (performedGenius && songs.length > similarityHighCount) {
		responseSource = similarityHighCount > 0 ? 'mixed' : 'genius'
	} else if (performedGenius || forceGenius) {
		responseSource = 'genius'
	} else if (songs.length > 0) {
		responseSource = 'database'
	} else {
		responseSource = 'genius'
	}

	const resultDTOs = songs.map(toSearchSongDTO)

	return {
		source: responseSource,
		songs: resultDTOs,
		canSearchGenius: !forceGenius,
		performedGenius,
		autoContinued,
	}
}
