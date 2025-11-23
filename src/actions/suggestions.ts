'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma'
import type { SearchSongDTO, Suggestion } from '@/types'
import { SEARCH_SUGGESTIONS_LIMIT } from '@/constants'

// export type SuggestionType = 'song' | 'artist' | 'album'


/**
 * Get search suggestions from cached results
 * Prioritizes recently cached, popular queries
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
		// Get cached searches that start with the query
		const cachedQueries = await prisma.searchCache.findMany({
			where: {
				query: {
					startsWith: normalizedQuery,
				},
				confidence: {
					in: ['high', 'medium'], // Only use confident results for suggestions
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
				updatedAt: 'desc', // Prefer recently cached results
			},
			take: Math.min(limit, 20), // Don't fetch too much raw data
		})

		// Extract and score suggestions
		const suggestionsMap = new Map<string, Suggestion & { score: number }>()

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
							score: 1 + timeBonus, // Songs rank higher
						})
					} else {
						existing.score += 1 + timeBonus
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
							score: 0.8 + timeBonus, // Artists rank slightly lower
						})
					} else {
						existing.score += 0.8 + timeBonus
					}
				}

				// Album suggestion (if different from song title)
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
							score: 0.6 + timeBonus, // Albums rank lower
						})
					} else {
						existing.score += 0.6 + timeBonus
					}
				}
			}
		}

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
 * Get popular search terms for initial suggestions (when no query)
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
			take: limit * 2, // Get more to filter
		})

		const suggestionCounts = new Map<string, number>()

		for (const entry of popularEntries) {
			if (!entry.songs || !Array.isArray(entry.songs)) continue

			const songs = entry.songs as SearchSongDTO[]
			for (const song of songs) {
				if (song.title) {
					suggestionCounts.set(
						song.title,
						(suggestionCounts.get(song.title) || 0) + 1
					)
				}
			}
		}

		// Return most frequent titles as suggestions
		return Array.from(suggestionCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, limit)
			.map(([text, count]) => ({
				text,
				type: 'song',
				metadata: { popularity: count },
			}))
	} catch (error) {
		console.error('Error fetching popular suggestions:', error)
		return []
	}
}
