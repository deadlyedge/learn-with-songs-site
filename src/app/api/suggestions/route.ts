import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import type { SearchSongDTO, Suggestion } from '@/types'
import { SEARCH_SUGGESTIONS_LIMIT } from '@/constants'

// Type for songs used in suggestion processing
type ProcessedSong = {
	id: string
	title: string
	artist: string
	album: string | null
	hasLyrics: boolean | null
	hasReferents: boolean | null
}

/**
 * Calculate overall match score for a song based on query relevance
 */
function calculateMatchScore(
	song: ProcessedSong,
	normalizedQuery: string,
): number {
	// 根据匹配质量确定基准分
	const getMatchScore = (
		field: string | null | undefined,
		isPrefixMatch: boolean,
	) => {
		if (!field) return 0
		const fieldLower = field.toLowerCase()

		// 检查前缀匹配
		const isPrefix = fieldLower.startsWith(normalizedQuery)

		// 检查完全匹配
		const isExact = fieldLower === normalizedQuery

		if (isExact) return isPrefixMatch ? 1.2 : 1.1 // 完全匹配最高
		if (isPrefix) return isPrefixMatch ? 1.0 : 0.9 // 前缀匹配中等
		if (fieldLower.includes(normalizedQuery)) return 0.7 // 包含匹配较低

		return 0 // 无匹配
	}

	// 使用预计算的字段确定内容丰富度评分
	const contentScore =
		(song.hasLyrics ? 0.8 : 0) + (song.hasReferents ? 0.2 : 0)

	const isPrefixMatch = Boolean(
		song.title?.toLowerCase().startsWith(normalizedQuery) ||
			song.artist?.toLowerCase().startsWith(normalizedQuery),
	)

	let totalScore = 0

	// Song title suggestion
	const titleScore = getMatchScore(song.title, isPrefixMatch)
	if (titleScore > 0) {
		totalScore += 1.0 + titleScore + contentScore * 0.5
	}

	// Artist suggestion
	const artistScore = getMatchScore(song.artist, isPrefixMatch)
	if (artistScore > 0) {
		totalScore += 0.8 + artistScore + contentScore * 0.3
	}

	return totalScore
}

/**
 * Process song suggestion logic
 */
function processSongSuggestion(
	song: ProcessedSong,
	normalizedQuery: string,
	suggestionsMap: Map<string, Suggestion & { score: number }>,
) {
	// 根据匹配质量确定基准分
	const getMatchScore = (
		field: string | null | undefined,
		isPrefixMatch: boolean,
	) => {
		if (!field) return 0
		const fieldLower = field.toLowerCase()

		// 检查前缀匹配
		const isPrefix = fieldLower.startsWith(normalizedQuery)

		// 检查完全匹配
		const isExact = fieldLower === normalizedQuery

		if (isExact) return isPrefixMatch ? 1.2 : 1.1 // 完全匹配最高
		if (isPrefix) return isPrefixMatch ? 1.0 : 0.9 // 前缀匹配中等
		if (fieldLower.includes(normalizedQuery)) return 0.7 // 包含匹配较低

		return 0 // 无匹配
	}

	// 使用预计算的字段确定内容丰富度评分
	const contentScore =
		(song.hasLyrics ? 0.8 : 0) + (song.hasReferents ? 0.2 : 0)

	const isPrefixMatch = Boolean(
		song.title?.toLowerCase().startsWith(normalizedQuery) ||
			song.artist?.toLowerCase().startsWith(normalizedQuery),
	)

	// Song title suggestion
	const titleScore = getMatchScore(song.title, isPrefixMatch)
	if (titleScore > 0) {
		const key = `song:${song.title}`
		const existing = suggestionsMap.get(key)

		if (!existing) {
			suggestionsMap.set(key, {
				text: song.title,
				type: 'song',
				metadata: {
					artist: song.artist ?? undefined,
					album: song.album ?? undefined,
				},
				score: 1.0 + titleScore + contentScore * 0.5,
			})
		} else {
			existing.score = Math.max(
				existing.score,
				1.0 + titleScore + contentScore * 0.5,
			)
		}
	}

	// Artist suggestion
	const artistScore = getMatchScore(song.artist, isPrefixMatch)
	if (artistScore > 0) {
		const key = `artist:${song.artist}`
		const existing = suggestionsMap.get(key)

		if (!existing) {
			suggestionsMap.set(key, {
				text: song.artist,
				type: 'artist',
				score: 0.8 + artistScore + contentScore * 0.3,
			})
		} else {
			existing.score = Math.max(
				existing.score,
				0.8 + artistScore + contentScore * 0.3,
			)
		}
	}
}

/**
 * Get search suggestions from cached results and Song table
 */
async function getSearchSuggestionsFromDB(
	query: string,
	limit: number = SEARCH_SUGGESTIONS_LIMIT,
): Promise<Suggestion[]> {
	if (!query || query.trim().length < 2) {
		return []
	}

	const normalizedQuery = query.trim().toLowerCase()

	try {
		// Extract and score suggestions - using a combined approach
		const suggestionsMap = new Map<string, Suggestion & { score: number }>()

		// 1. Get suggestions from cached results (higher priority)
		await getCachedSuggestions(normalizedQuery, suggestionsMap, limit)

		// 2. Get suggestions from Song table directly (for better coverage)
		await getSongBasedSuggestions(normalizedQuery, suggestionsMap, limit)

		// Sort by score and return top suggestions
		const sortedSuggestions = Array.from(suggestionsMap.values())
			.sort((a, b) => b.score - a.score)
			.slice(0, limit)

		// Remove score from final output
		return sortedSuggestions.map(({ score, ...suggestion }) => suggestion)
	} catch (error) {
		console.error('Error fetching search suggestions:', error)
		return []
	}
}

/**
 * Get suggestions from cached search results
 */
async function getCachedSuggestions(
	normalizedQuery: string,
	suggestionsMap: Map<string, Suggestion & { score: number }>,
	limit: number,
) {
	const cachedQueries = await prisma.searchCache.findMany({
		where: {
			query: {
				startsWith: normalizedQuery,
			},
			confidence: {
				in: ['high', 'medium'],
			},
			songs: {
				not: Prisma.JsonNull,
			},
		},
		select: {
			songs: true,
			updatedAt: true,
		},
		orderBy: {
			updatedAt: 'desc',
		},
		take: Math.min(limit, 10),
	})

	for (const cacheEntry of cachedQueries) {
		if (!cacheEntry.songs || !Array.isArray(cacheEntry.songs)) continue

		const songs = cacheEntry.songs as SearchSongDTO[]
		const recencyScore = Date.now() - cacheEntry.updatedAt.getTime()
		const timeBonus = Math.max(
			0,
			(24 * 60 * 60 * 1000 - recencyScore) / (24 * 60 * 60 * 1000),
		)

		for (const song of songs) {
			// Song title suggestion
			if (song.title?.toLowerCase().startsWith(normalizedQuery)) {
				const key = `song:${song.title}`
				const existing = suggestionsMap.get(key)

				if (!existing) {
					suggestionsMap.set(key, {
						text: song.title,
						type: 'song',
						metadata: {
							artist: song.artist ?? undefined,
							album: song.album ?? undefined,
						},
						score: 1.5 + timeBonus,
					})
				} else {
					existing.score = Math.max(existing.score, 1.5 + timeBonus)
				}
			}

			// Artist suggestion
			if (song.artist?.toLowerCase().startsWith(normalizedQuery)) {
				const key = `artist:${song.artist}`
				const existing = suggestionsMap.get(key)

				if (!existing) {
					suggestionsMap.set(key, {
						text: song.artist,
						type: 'artist',
						score: 1.3 + timeBonus,
					})
				} else {
					existing.score = Math.max(existing.score, 1.3 + timeBonus)
				}
			}
		}
	}
}

/**
 * Get suggestions directly from Song table
 */
async function getSongBasedSuggestions(
	normalizedQuery: string,
	suggestionsMap: Map<string, Suggestion & { score: number }>,
	limit: number,
) {
	try {
		const candidateLimit = limit * 2

		// Parallel queries: prefix matching and similarity matching
		const [prefixResults, similarityResults] = await Promise.all([
			getPrefixMatchingSongs(normalizedQuery, candidateLimit),
			getSimilarityMatchingSongs(normalizedQuery, [], candidateLimit),
		])

		// Merge all candidates
		const allCandidates = [...prefixResults, ...similarityResults]

		// Calculate scores for each result
		const scoredCandidates = allCandidates.map((song) => ({
			song,
			score: calculateMatchScore(song, normalizedQuery),
		}))

		// Sort by score and take top results
		const bestResults = scoredCandidates
			.sort((a, b) => b.score - a.score)
			.slice(0, limit)

		// Process selected results
		for (const { song } of bestResults) {
			processSongSuggestion(song, normalizedQuery, suggestionsMap)
		}
	} catch (error) {
		console.error('Error in hybrid search:', error)
		// Fallback to prefix-only strategy
		await fallbackToPrefixOnly(normalizedQuery, suggestionsMap, limit)
	}
}

/**
 * Prefix matching strategy
 */
async function getPrefixMatchingSongs(normalizedQuery: string, limit: number) {
	return await prisma.song.findMany({
		where: {
			hasDetails: true,
			OR: [
				{ title: { startsWith: normalizedQuery, mode: 'insensitive' } },
				{ artist: { startsWith: normalizedQuery, mode: 'insensitive' } },
			],
		},
		select: {
			id: true,
			title: true,
			artist: true,
			album: true,
			hasLyrics: true,
			hasReferents: true,
		},
		orderBy: {
			updatedAt: 'desc',
		},
		take: Math.floor(limit * 0.7),
	})
}

/**
 * Similarity matching strategy using pg_trgm
 */
async function getSimilarityMatchingSongs(
	normalizedQuery: string,
	excludedIds: string[],
	limit: number,
) {
	const hasMiddleMatches = normalizedQuery.length >= 3
	const similarityThreshold =
		normalizedQuery.length >= 4 ? 0.3 : hasMiddleMatches ? 0.25 : 0.6

	const rawQuery = `
		SELECT
			s.id, s.title, s.artist, s.album, s."hasLyrics", s."hasReferents",
			CASE
				WHEN s.title ILIKE '%' || $1 || '%' THEN 1.0
				WHEN s.artist ILIKE '%' || $1 || '%' THEN 0.9
				ELSE 0.0
			END as match_priority,
			(similarity(s.title, $1) + similarity(s.artist, $1)) / 2 as avg_similarity,
			s."updatedAt"
		FROM "Song" s
		WHERE s."hasDetails" = true
			AND s.id NOT IN (${
				excludedIds.length > 0
					? excludedIds.map((id) => `'${id}'`).join(',')
					: "'dummy'"
			})
			AND (
				similarity(s.title, $1) > $2
				OR similarity(s.artist, $1) > $2
				OR s.title ILIKE '%' || $1 || '%'
				OR s.artist ILIKE '%' || $1 || '%'
			)
		ORDER BY match_priority DESC, avg_similarity DESC, s."updatedAt" DESC
		LIMIT $3
	`

	try {
		const result = (await prisma.$queryRawUnsafe(
			rawQuery,
			normalizedQuery,
			similarityThreshold,
			Math.floor(limit * 1),
		)) as Array<{
			id: string
			title: string
			artist: string
			album: string | null
			hasLyrics: boolean
			hasReferents: boolean
		}>

		return result
	} catch (error) {
		console.error('Similarity search failed:', error)
		return []
	}
}

/**
 * Fallback strategy when hybrid search fails
 */
async function fallbackToPrefixOnly(
	normalizedQuery: string,
	suggestionsMap: Map<string, Suggestion & { score: number }>,
	limit: number,
) {
	try {
		const songs = await prisma.song.findMany({
			where: {
				hasDetails: true,
				OR: [
					{ title: { startsWith: normalizedQuery, mode: 'insensitive' } },
					{ artist: { startsWith: normalizedQuery, mode: 'insensitive' } },
				],
			},
			select: {
				id: true,
				title: true,
				artist: true,
				album: true,
				hasLyrics: true,
				hasReferents: true,
			},
			orderBy: { updatedAt: 'desc' },
			take: limit,
		})

		for (const song of songs) {
			processSongSuggestion(song, normalizedQuery, suggestionsMap)
		}
	} catch (error) {
		console.error('Fallback search failed:', error)
	}
}

// GET /api/suggestions - 获取搜索建议
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = request.nextUrl
		const query = searchParams.get('query')
		const limitParam = searchParams.get('limit')
		const limit = limitParam
			? parseInt(limitParam, 10)
			: SEARCH_SUGGESTIONS_LIMIT

		if (!query) {
			return NextResponse.json(
				{ error: 'Query parameter is required' },
				{ status: 400 },
			)
		}

		const suggestions = await getSearchSuggestionsFromDB(query, limit)
		return NextResponse.json({ suggestions })
	} catch (error) {
		console.error('Error fetching suggestions:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		)
	}
}
