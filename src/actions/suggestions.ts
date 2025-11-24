'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma'
import type { SearchSongDTO, Suggestion } from '@/types'
import { SEARCH_SUGGESTIONS_LIMIT } from '@/constants'

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
 */
async function getSongBasedSuggestions(
	normalizedQuery: string,
	suggestionsMap: Map<string, Suggestion & { score: number }>,
	limit: number
) {
	// Get songs that have been enriched with lyrics or annotations (details available)
	const detailedSongs = await prisma.song.findMany({
		where: {
			OR: [
				{ lyrics: { isNot: null } }, // Has lyrics
				{ referents: { some: {} } }, // Has annotations
				{ detailsFetchedAt: { not: null } }, // Has been processed
			],
			AND: [
				{
					OR: [
						{ title: { startsWith: normalizedQuery, mode: 'insensitive' } },
						{ artist: { startsWith: normalizedQuery, mode: 'insensitive' } },
						{ album: { startsWith: normalizedQuery, mode: 'insensitive' } },
					],
				},
			],
		},
		select: {
			id: true,
			title: true,
			artist: true,
			album: true,
			lyrics: {
				select: { id: true }, // Just check if exists
			},
			referents: {
				select: { id: true },
				take: 1, // Just check if exists
			},
		},
		orderBy: {
			updatedAt: 'desc', // Prefer recently updated songs
		},
		take: Math.min(limit, 20), // Don't fetch too much
	})

	for (const song of detailedSongs) {
		// Determine relevance score based on content richness
		const hasLyrics = !!song.lyrics
		const hasReferents = song.referents.length > 0
		const contentScore = (hasLyrics ? 0.8 : 0) + (hasReferents ? 0.2 : 0)

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
					score: 1.0 + contentScore, // Detailed songs get good priority
				})
			} else {
				existing.score = Math.max(existing.score, 1.0 + contentScore)
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
					score: 0.8 + contentScore,
				})
			} else {
				existing.score = Math.max(existing.score, 0.8 + contentScore)
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
					score: 0.6 + contentScore,
				})
			} else {
				existing.score = Math.max(existing.score, 0.6 + contentScore)
			}
		}
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

		// Add recently detailed songs (songs with content)
		const detailedSongs = await prisma.song.findMany({
			where: {
				OR: [{ lyrics: { isNot: null } }, { referents: { some: {} } }],
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
