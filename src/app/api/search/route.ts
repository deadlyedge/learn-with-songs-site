import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { searchGeniusSongs } from '@/lib/genius'
import type { Prisma } from '@/generated/prisma/client'
import type {
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
	MAX_SEARCH_RESULTS,
} from '@/constants'

type CacheConfidence = 'high' | 'medium' | 'low' | 'ongoing' | null
type CacheResult = {
	songs: SearchSongDTO[]
	confidence: CacheConfidence
}

type SongWithSimilarity = SongSearchResult & {
	similarity: number
}

/**
 * Normalizes a query string by trimming and converting to lowercase
 */
const normalizeQuery = (value: string) => value.trim().toLowerCase()

/**
 * Database select fields for song searches
 */
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
	take: number,
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
		WHERE "hasDetails" = true
			AND (
				similarity("title", ${query}) > ${SIMILARITY_LOW_THRESHOLD}
				OR similarity("artist", ${query}) > ${SIMILARITY_LOW_THRESHOLD}
			)
		ORDER BY similarity DESC
		LIMIT ${take}
	`

	return raw
}

const determineConfidence = (
	highMatches: number,
	mediumMatches: number,
	totalMatches: number,
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
	normalizedQuery: string,
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

/**
 * Checks if a Genius API call is currently in progress for the given query
 */
const isGeniusCallInProgress = async (query: string): Promise<boolean> => {
	const ongoingEntry = await prisma.searchCache.findUnique({
		where: { query },
		select: { confidence: true, updatedAt: true },
	})

	if (!ongoingEntry) {
		return false
	}

	return ongoingEntry.confidence === 'ongoing'
}

/**
 * Mark that a Genius API call is in progress for the given query
 */
const markGeniusCallInProgress = async (query: string) => {
	await prisma.searchCache.upsert({
		where: { query },
		create: {
			query,
			songs: [],
			confidence: 'ongoing',
		},
		update: {
			songs: [],
			confidence: 'ongoing',
			updatedAt: new Date(),
		},
	})
}

/**
 * Clear the ongoing Genius API call marker for the given query
 */
const clearGeniusCallInProgress = async (query: string) => {
	await prisma.searchCache.updateMany({
		where: {
			query,
			confidence: 'ongoing',
		},
		data: {
			songs: [],
			confidence: null,
			updatedAt: new Date(),
		},
	})
}

/**
 * Cache search results if they have valid content and confidence level
 */
const cacheSearchResults = async (
	normalizedQuery: string,
	songs: SearchSongDTO[],
	confidence: CacheConfidence,
) => {
	if (
		!normalizedQuery ||
		songs.length === 0 ||
		confidence === 'low' ||
		confidence === 'ongoing' ||
		confidence === null
	) {
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

const buildSearchConditions = (trimmedQuery: string) => {
	const normalizedWords = trimmedQuery
		.split(/\s+/)
		.map((word) => word.trim())
		.filter((word) => word.length >= 3)

	const mediumConfidenceWhere: Prisma.SongWhereInput = {
		hasDetails: true,
		OR: [
			{ title: { contains: trimmedQuery, mode: 'insensitive' } },
			{ artist: { contains: trimmedQuery, mode: 'insensitive' } },
		],
	}

	const lowConfidenceWhere: Prisma.SongWhereInput | null =
		normalizedWords.length > 0
			? {
					hasDetails: true,
					OR: normalizedWords.flatMap((word) => [
						{ title: { contains: word, mode: 'insensitive' } },
						{ artist: { contains: word, mode: 'insensitive' } },
					]),
				}
			: null

	return { mediumConfidenceWhere, lowConfidenceWhere }
}

const checkCacheResults = async (
	normalizedQuery: string,
	forceGenius: boolean,
): Promise<SongSearchResponse | null> => {
	if (forceGenius) {
		return null
	}

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

	return null
}

/**
 * Performs local database search optimized for efficiency
 */
const performLocalSearch = async (trimmedQuery: string) => {
	const { mediumConfidenceWhere, lowConfidenceWhere } =
		buildSearchConditions(trimmedQuery)

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
			if (songs.length >= MAX_SEARCH_RESULTS) {
				break
			}
		}
		return added
	}

	const [similarityMatches, mediumMatches, lowMatches] = await Promise.all([
		searchBySimilarity(trimmedQuery, MAX_SEARCH_RESULTS),
		executeLocalSearch(mediumConfidenceWhere, MAX_SEARCH_RESULTS),
		lowConfidenceWhere
			? executeLocalSearch(lowConfidenceWhere, MAX_SEARCH_RESULTS)
			: Promise.resolve([]),
	])

	appendUnique(similarityMatches)
	if (songs.length < MAX_SEARCH_RESULTS) {
		appendUnique(mediumMatches)
	}
	if (songs.length < MAX_SEARCH_RESULTS) {
		appendUnique(lowMatches)
	}

	const songsWithSimilarity = similarityMatches.map((song) => ({
		...song,
		similarity: song.similarity || 0,
	}))

	const similarityHighCount = songsWithSimilarity.filter(
		(item) => item.similarity >= SIMILARITY_HIGH_THRESHOLD,
	).length
	const similarityMediumCount = songsWithSimilarity.filter(
		(item) =>
			item.similarity >= SIMILARITY_LOW_THRESHOLD &&
			item.similarity < SIMILARITY_HIGH_THRESHOLD,
	).length

	return { songs, similarityHighCount, similarityMediumCount }
}

const handleGeniusFallback = async (
	trimmedQuery: string,
	forceGenius: boolean,
	songs: SongSearchResult[],
	confidence: CacheConfidence,
) => {
	if (forceGenius || confidence === 'low') {
		const callInProgress = await isGeniusCallInProgress(trimmedQuery)

		if (callInProgress) {
			console.log(
				`[Genius Search Skipped] Query "${trimmedQuery}" is already being processed`,
			)
			return { performedGenius: false, autoContinued: false }
		}

		await markGeniusCallInProgress(trimmedQuery)

		try {
			const fallbackSongs: GeniusSongResponse[] =
				await searchGeniusSongs(trimmedQuery)

			if (fallbackSongs.length > 0) {
				console.log('[Genius Search] ', trimmedQuery)
				const performedGenius = true
				const autoContinued = !forceGenius && songs.length > 0

				const persisted: SongSearchResult[] = await Promise.all(
					fallbackSongs
						.slice(0, MAX_SEARCH_RESULTS)
						.map((song) => upsertNormalizedSong(song)),
				)

				const seen = new Set(songs.map((song) => song.id))
				for (const song of persisted) {
					if (!seen.has(song.id)) {
						seen.add(song.id)
						songs.push(song)
						if (songs.length >= MAX_SEARCH_RESULTS) {
							break
						}
					}
				}

				const songDTOs = songs.map(toSearchSongDTO)
				await cacheSearchResults(trimmedQuery, songDTOs, confidence)

				return { performedGenius, autoContinued }
			} else {
				console.warn(
					`[Genius Search] No results found for query: "${trimmedQuery}"`,
				)
			}
		} catch (error) {
			console.error(
				`[Genius Search Error] Failed to search Genius for query "${trimmedQuery}":`,
				error,
			)
		} finally {
			await clearGeniusCallInProgress(trimmedQuery)
		}
	}

	return { performedGenius: false, autoContinued: false }
}

const determineResponseSource = (
	performedGenius: boolean,
	forceGenius: boolean,
	songs: SongSearchResult[],
	similarityHighCount: number,
): SongSearchResponse['source'] => {
	if (forceGenius || performedGenius) {
		if (performedGenius && similarityHighCount > 0) {
			return 'mixed'
		}
		return 'genius'
	}

	if (songs.length > 0) {
		return 'database'
	}

	return 'genius'
}

// GET /api/search - 搜索歌曲
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = request.nextUrl
		const query = searchParams.get('query')
		const source = searchParams.get('source')

		if (!query) {
			return NextResponse.json(
				{ error: 'Query parameter is required' },
				{ status: 400 },
			)
		}

		const trimmedQuery = query.trim()
		const normalizedQuery = normalizeQuery(trimmedQuery)
		const forceGenius = source === 'genius'

		// Check cache first if not forcing Genius
		const cachedResponse = await checkCacheResults(normalizedQuery, forceGenius)
		if (cachedResponse) {
			return NextResponse.json(cachedResponse)
		}

		// Perform local search
		const { songs, similarityHighCount, similarityMediumCount } =
			await performLocalSearch(trimmedQuery)

		const confidence = determineConfidence(
			similarityHighCount,
			similarityMediumCount,
			songs.length,
		)

		// Handle Genius fallback if needed
		const { performedGenius, autoContinued } = await handleGeniusFallback(
			trimmedQuery,
			forceGenius,
			songs,
			confidence,
		)

		// If no Genius was needed, cache the results
		if (!forceGenius && !performedGenius) {
			const songDTOs = songs.map(toSearchSongDTO)
			await cacheSearchResults(normalizedQuery, songDTOs, confidence)
		}

		const responseSource = determineResponseSource(
			performedGenius,
			forceGenius,
			songs,
			similarityHighCount,
		)
		const resultDTOs = songs.map(toSearchSongDTO)

		const response: SongSearchResponse = {
			source: responseSource,
			songs: resultDTOs,
			canSearchGenius: !forceGenius,
			performedGenius,
			autoContinued,
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error('Error searching songs:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		)
	}
}
