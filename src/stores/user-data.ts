import { create } from 'zustand'
import type { CollectionSong, VocabularyEntryWithSongData } from '@/types'

type UserDataState = {
	// State
	vocabulary: VocabularyEntryWithSongData[]
	collections: CollectionSong[]
	collectionFilter: {
		key: keyof CollectionSong
		order: 'asc' | 'desc'
	}
	loading: boolean
	error: string | null

	// Computed values
	newWordsCount: number
	historyWordsCount: number
	collectionsCount: number

	// Actions - Vocabulary
	fetchVocabulary: () => Promise<void>
	addVocabularyItem: (item: {
		word: string
		line: string
		lineNumber: number | null
		result: string
		songId: string
		songPath: string
	}) => Promise<void>
	updateVocabularyItem: (
		id: string,
		updates: { word?: string; line?: string; result?: string },
	) => Promise<void>
	toggleMastered: (id: string) => Promise<void>

	// Actions - Collections
	fetchCollections: () => Promise<void>
	addToCollections: (songId: string) => Promise<void>
	removeFromCollections: (songId: string) => Promise<void>

	// Actions - Collections filtering
	setCollectionFilter: (filter: {
		key: keyof CollectionSong
		order: 'asc' | 'desc'
	}) => void

	// Utility
	setError: (error: string | null) => void
	setLoading: (loading: boolean) => void
}

export const useUserDataStore = create<UserDataState>((set, get) => ({
	// Initial state
	vocabulary: [],
	collections: [],
	collectionFilter: { key: 'title', order: 'asc' },
	loading: false,
	error: null,

	// Computed
	get newWordsCount() {
		return get().vocabulary.filter((item) => !item.mastered).length
	},
	get historyWordsCount() {
		return get().vocabulary.filter((item) => item.mastered).length
	},
	get collectionsCount() {
		return get().collections.length
	},

	// Vocabulary actions
	fetchVocabulary: async () => {
		set({ loading: true, error: null })
		try {
			const res = await fetch('/api/vocabulary')
			if (!res.ok) {
				const error = await res.json()
				throw new Error(error.error || 'Failed to fetch vocabulary')
			}
			const data = await res.json()
			set({ vocabulary: data.vocabulary, loading: false })
		} catch (error) {
			set({
				loading: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			})
		}
	},

	addVocabularyItem: async (item) => {
		const { vocabulary } = get()
		const optimisticId = `optimistic-${Date.now()}`

		// Optimistic update
		const optimisticItem: VocabularyEntryWithSongData = {
			id: optimisticId,
			...item,
			songTitle: 'Loading...',
			songArtworkUrl: null,
			mastered: false,
		}

		set({ vocabulary: [...vocabulary, optimisticItem], loading: true })

		try {
			const res = await fetch('/api/vocabulary', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(item),
			})
			if (!res.ok) {
				const error = await res.json()
				throw new Error(error.error || 'Failed to add vocabulary entry')
			}
			// Refresh data to get the real entry
			await get().fetchVocabulary()
		} catch (error) {
			// Revert optimistic update
			set({
				vocabulary: vocabulary,
				error:
					error instanceof Error
						? error.message
						: 'Failed to add vocabulary item',
			})
		} finally {
			set({ loading: false })
		}
	},

	updateVocabularyItem: async (id, updates) => {
		const { vocabulary } = get()
		const itemIndex = vocabulary.findIndex((item) => item.id === id)

		if (itemIndex === -1) return

		const originalItem = vocabulary[itemIndex]

		// Optimistic update
		const optimisticItem = { ...originalItem, ...updates }
		set({
			vocabulary: vocabulary.map((item) =>
				item.id === id ? optimisticItem : item,
			),
			loading: true,
		})

		try {
			const res = await fetch(`/api/vocabulary/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					result: optimisticItem.result,
					songPath: optimisticItem.songPath,
				}),
			})
			if (!res.ok) {
				const error = await res.json()
				throw new Error(error.error || 'Failed to update vocabulary entry')
			}
		} catch (error) {
			// Revert optimistic update
			set({
				vocabulary: vocabulary,
				error:
					error instanceof Error
						? error.message
						: 'Failed to update vocabulary item',
			})
		} finally {
			set({ loading: false })
		}
	},

	toggleMastered: async (id) => {
		const { vocabulary } = get()
		const item = vocabulary.find((item) => item.id === id)

		if (!item) return

		// Optimistic update
		const newMastered = !item.mastered
		set({
			vocabulary: vocabulary.map((v) =>
				v.id === id ? { ...v, mastered: newMastered } : v,
			),
		})

		try {
			const res = await fetch(`/api/vocabulary/${id}/mastered`, {
				method: 'PATCH',
			})
			if (!res.ok) {
				const error = await res.json()
				throw new Error(error.error || 'Failed to toggle mastered state')
			}
		} catch (error) {
			// Revert optimistic update
			set({
				vocabulary: vocabulary.map((v) =>
					v.id === id ? { ...v, mastered: item.mastered } : v,
				),
				error:
					error instanceof Error
						? error.message
						: 'Failed to toggle mastered state',
			})
		}
	},

	// Collections actions
	fetchCollections: async () => {
		set({ loading: true, error: null })
		try {
			const res = await fetch('/api/collections')
			if (!res.ok) {
				const error = await res.json()
				throw new Error(error.error || 'Failed to fetch collections')
			}
			const data = await res.json()
			set({ collections: data.collections, loading: false })
		} catch (error) {
			set({
				loading: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			})
		}
	},

	addToCollections: async (songId) => {
		const { collections } = get()

		// Optimistic update - temporarily add placeholder
		const tempSong: CollectionSong = {
			id: songId,
			title: 'Loading...',
			artist: 'Loading...',
			album: null,
			artworkUrl: null,
			releaseDate: null,
			geniusPath: null,
			url: null,
		}

		set({ collections: [...collections, tempSong], loading: true })

		try {
			const res = await fetch('/api/collections', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ songId }),
			})
			if (!res.ok) {
				const error = await res.json()
				throw new Error(error.error || 'Failed to add to collection')
			}
			// Refresh to get complete song data
			await get().fetchCollections()
		} catch (error) {
			// Revert optimistic update
			set({
				collections: collections,
				error:
					error instanceof Error
						? error.message
						: 'Failed to add to collections',
			})
		} finally {
			set({ loading: false })
		}
	},

	removeFromCollections: async (songId) => {
		const { collections } = get()

		// Optimistic update
		set({
			collections: collections.filter((song) => song.id !== songId),
			loading: true,
		})

		try {
			const res = await fetch(`/api/collections/${songId}`, {
				method: 'DELETE',
			})
			if (!res.ok) {
				const error = await res.json()
				throw new Error(error.error || 'Failed to remove from collection')
			}
		} catch (error) {
			// Revert optimistic update
			set({
				collections: collections,
				error:
					error instanceof Error
						? error.message
						: 'Failed to remove from collections',
			})
		} finally {
			set({ loading: false })
		}
	},

	// Collections filtering
	setCollectionFilter: ({ key, order }) => {
		const collections = get().collections
		const sortedCollections = [...collections].sort((a, b) => {
			const aValue = a[key]
			const bValue = b[key]
			if (aValue && bValue) {
				if (order === 'asc') {
					return aValue.localeCompare(bValue)
				} else {
					return bValue.localeCompare(aValue)
				}
			}
			return 0
		})
		set({
			collectionFilter: {
				key,
				order,
			},
			collections: sortedCollections,
		})
	},

	// Utility functions
	setError: (error) => set({ error }),
	setLoading: (loading) => set({ loading }),
}))
