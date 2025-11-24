'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma'
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
 * Get search suggestions from cached results and Song table
 * Combines cache suggestions with database suggestions for better coverage
 */
export async function getSearchSuggestions(
	query: string,
	limit: number = SEARCH_SUGGESTIONS_LIMIT
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
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
	limit: number
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
		take: Math.min(limit, 10), // Limit cache queries
	})

	for (const cacheEntry of cachedQueries) {
		if (!cacheEntry.songs || !Array.isArray(cacheEntry.songs)) continue

		const songs = cacheEntry.songs as SearchSongDTO[]
		const recencyScore = Date.now() - cacheEntry.updatedAt.getTime()
		const timeBonus = Math.max(
			0,
			(24 * 60 * 60 * 1000 - recencyScore) / (24 * 60 * 60 * 1000)
		) // 24h half-life

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
						score: 1.5 + timeBonus, // Cached results get higher priority
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

			// Album suggestion
			if (
				song.album &&
				song.album !== song.title &&
				song.album.toLowerCase().startsWith(normalizedQuery)
			) {
				const key = `album:${song.album}`
				const existing = suggestionsMap.get(key)

				if (!existing) {
					suggestionsMap.set(key, {
						text: song.album,
						type: 'album',
						metadata: {
							artist: song.artist ?? undefined,
						},
						score: 1.1 + timeBonus,
					})
				} else {
					existing.score = Math.max(existing.score, 1.1 + timeBonus)
				}
			}
		}
	}
}

/**
 * Get suggestions directly from Song table for songs with details
 * 🚀 智能混合策略：前缀匹配 + 相似度匹配
 */
async function getSongBasedSuggestions(
	normalizedQuery: string,
	suggestionsMap: Map<string, Suggestion & { score: number }>,
	limit: number
) {
	// 实施智能混合匹配策略
	try {
		// 方案1: 前缀匹配（精确，高优先级）
		const prefixResults = await getPrefixMatchingSongs(normalizedQuery, limit)

		// 方案2: 相似度匹配（补充，追加更多相关结果）
		const similarityResults = await getSimilarityMatchingSongs(normalizedQuery, prefixResults.map(r => r.id), limit)

		// 合并结果并处理评分
		const allResults = [...prefixResults, ...similarityResults]

		for (const song of allResults) {
			processSongSuggestion(song, normalizedQuery, suggestionsMap)
		}
	} catch (error) {
		console.error('Error in hybrid search:', error)
		// 降级到简单的startsWith策略
		fallbackToPrefixOnly(normalizedQuery, suggestionsMap, limit)
	}
}

/**
 * 前缀匹配策略：精确且快速
 */
async function getPrefixMatchingSongs(normalizedQuery: string, limit: number) {
	return await prisma.song.findMany({
		where: {
			hasDetails: true,
			OR: [
				{ title: { startsWith: normalizedQuery, mode: 'insensitive' } },
				{ artist: { startsWith: normalizedQuery, mode: 'insensitive' } },
				{ album: { startsWith: normalizedQuery, mode: 'insensitive' } },
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
		take: Math.floor(limit * 0.7), // 前缀匹配占70%配额
	})
}

/**
 * 相似度匹配策略：使用pg_trgm相似度
 */
async function getSimilarityMatchingSongs(normalizedQuery: string, excludedIds: string[], limit: number) {
	// 使用Prisma的SQL查询能力进行相似度匹配
	const similarityThreshold = normalizedQuery.length >= 4 ? 0.4 : 0.6 // 长查询更严格

	const rawQuery = `
		SELECT DISTINCT
			s.id, s.title, s.artist, s.album, s."hasLyrics", s."hasReferents"
		FROM "Song" s
		WHERE s."hasDetails" = true
			AND s.id NOT IN (${excludedIds.length > 0 ? excludedIds.map(id => `'${id}'`).join(',') : "'dummy'"})
			AND (
				similarity(s.title, $1) > $2
				OR similarity(s.artist, $1) > $2
				OR similarity(s.album, $1) > $2
			)
		ORDER BY
			-- 综合相似度评分
			((similarity(s.title, $1) + similarity(s.artist, $1) + similarity(s.album, $1)) / 3) DESC,
			s."updatedAt" DESC
		LIMIT $3
	`

	try {
		const result = await prisma.$queryRawUnsafe(
			rawQuery,
			normalizedQuery,
			similarityThreshold,
			Math.floor(limit * 0.3) // 相似度匹配占30%配额
		) as Array<{
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
 * 处理单个song的suggestion逻辑
 */
function processSongSuggestion(
	song: ProcessedSong,
	normalizedQuery: string,
	suggestionsMap: Map<string, Suggestion & { score: number }>
) {
	// 根据匹配质量确定基准分
	const getMatchScore = (field: string | null | undefined, isPrefixMatch: boolean) => {
		if (!field) return 0
		const fieldLower = field.toLowerCase()

		// 检查前缀匹配
		const isPrefix = fieldLower.startsWith(normalizedQuery)

		// 检查完全匹配
		const isExact = fieldLower === normalizedQuery

		if (isExact) return isPrefixMatch ? 1.2 : 1.1    // 完全匹配最高
		if (isPrefix) return isPrefixMatch ? 1.0 : 0.9  // 前缀匹配中等
		if (fieldLower.includes(normalizedQuery)) return 0.7 // 包含匹配较低

		return 0 // 无匹配
	}

	// 使用预计算的字段确定内容丰富度评分
	const contentScore = (song.hasLyrics ? 0.8 : 0) + (song.hasReferents ? 0.2 : 0)

	const isPrefixMatch = Boolean(
		song.title?.toLowerCase().startsWith(normalizedQuery) ||
		song.artist?.toLowerCase().startsWith(normalizedQuery) ||
		song.album?.toLowerCase().startsWith(normalizedQuery)
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
				score: 1.0 + titleScore + (contentScore * 0.5), // 前缀匹配得分更高
			})
		} else {
			existing.score = Math.max(existing.score, 1.0 + titleScore + (contentScore * 0.5))
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
				score: 0.8 + artistScore + (contentScore * 0.3),
			})
		} else {
			existing.score = Math.max(existing.score, 0.8 + artistScore + (contentScore * 0.3))
		}
	}

	// Album suggestion
	if (song.album && song.album !== song.title) {
		const albumScore = getMatchScore(song.album, isPrefixMatch)
		if (albumScore > 0) {
			const key = `album:${song.album}`
			const existing = suggestionsMap.get(key)

			if (!existing) {
				suggestionsMap.set(key, {
					text: song.album,
					type: 'album',
					metadata: {
						artist: song.artist ?? undefined,
					},
					score: 0.6 + albumScore + (contentScore * 0.2),
				})
			} else {
				existing.score = Math.max(existing.score, 0.6 + albumScore + (contentScore * 0.2))
			}
		}
	}
}

/**
 * 降级策略：当混合搜索失败时退回到纯前缀匹配
 */
async function fallbackToPrefixOnly(
	normalizedQuery: string,
	suggestionsMap: Map<string, Suggestion & { score: number }>,
	limit: number
) {
	try {
		const songs = await prisma.song.findMany({
			where: {
				hasDetails: true,
				OR: [
					{ title: { startsWith: normalizedQuery, mode: 'insensitive' } },
					{ artist: { startsWith: normalizedQuery, mode: 'insensitive' } },
					{ album: { startsWith: normalizedQuery, mode: 'insensitive' } },
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

/**
 * Get popular search terms for initial suggestions (when no query)
 * Combines frequently searched songs with recently detailed songs
 */
export async function getPopularSuggestions(
	limit: number = SEARCH_SUGGESTIONS_LIMIT
): Promise<Suggestion[]> {
	try {
		const popularEntries = await prisma.searchCache.findMany({
			select: {
				songs: true,
			},
			orderBy: {
				updatedAt: 'desc',
			},
			take: limit * 2,
		})

		const suggestionCounts = new Map<string, Suggestion & { count: number }>()

		// Count popular songs from search cache
		for (const entry of popularEntries) {
			if (!entry.songs || !Array.isArray(entry.songs)) continue

			const songs = entry.songs as SearchSongDTO[]
			for (const song of songs) {
				if (song.title) {
					const key = `popular:${song.title}`
					const existing = suggestionCounts.get(key)

					if (!existing) {
						suggestionCounts.set(key, {
							text: song.title,
							type: 'song',
							metadata: {
								artist: song.artist ?? undefined,
								popularity: 1,
							},
							count: 1,
						})
					} else {
						existing.metadata!.popularity =
							(existing.metadata!.popularity ?? 0) + 1
						existing.count += 1
					}
				}
			}
		}

		// Add recently detailed songs (songs with content) - 使用优化字段
		const detailedSongs = await prisma.song.findMany({
			where: {
				hasDetails: true, // ⚡ 索引优化：避免复杂JOIN
			},
			select: {
				id: true,
				title: true,
				artist: true,
				album: true,
				updatedAt: true,
			},
			orderBy: {
				updatedAt: 'desc',
			},
			take: Math.min(limit, 10),
		})

		for (const song of detailedSongs) {
			const key = `detailed:${song.title}`
			const existing = suggestionCounts.get(key)

			if (!existing) {
				suggestionCounts.set(key, {
					text: song.title,
					type: 'song',
					metadata: {
						artist: song.artist ?? undefined,
						popularity: 0, // Detailed songs get base priority
					},
					count: 0.5, // Lower count for detailed songs
				})
			}
		}

		// Sort by popularity/count and return top suggestions
		return Array.from(suggestionCounts.values())
			.sort((a, b) => b.count - a.count)
			.slice(0, limit)
			.map(({ count, ...suggestion }) => ({
				...suggestion,
				metadata: {
					...suggestion.metadata,
					newSuggestion: count <= 1, // Mark as "new" if low popularity
				},
			}))
	} catch (error) {
		console.error('Error fetching popular suggestions:', error)
		return []
	}
}
