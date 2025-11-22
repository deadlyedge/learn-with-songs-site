import { create } from 'zustand'
import {
	getUserVocabulary,
	addVocabularyEntry,
	updateVocabularyEntry,
	switchMasteredState,
} from '@/actions/vocabulary'
import {
	getUserCollections,
	addSongToUserCollections,
	removeSongFromUserCollections,
} from '@/actions/collections'
import type { CollectionSong, VocabularyEntryWithSongData } from '@/types'

type UserDataState = {
	// State
	vocabulary: VocabularyEntryWithSongData[]
	collections: CollectionSong[]
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
		updates: { word?: string; line?: string; result?: string }
	) => Promise<void>
	toggleMastered: (id: string) => Promise<void>

	// Actions - Collections
	fetchCollections: () => Promise<void>
	addToCollections: (songId: string) => Promise<void>
	removeFromCollections: (songId: string) => Promise<void>

	// Utility
	setError: (error: string | null) => void
	setLoading: (loading: boolean) => void
}

export const useUserDataStore = create<UserDataState>((set, get) => ({
	// Initial state
	vocabulary: [],
	collections: [],
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
			const vocabulary = await getUserVocabulary()
			if (vocabulary) {
				set({ vocabulary, loading: false })
			} else {
				set({ loading: false, error: 'Failed to load vocabulary' })
			}
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
			await addVocabularyEntry(item)
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
				item.id === id ? optimisticItem : item
			),
			loading: true,
		})

		try {
			await updateVocabularyEntry({
				word: optimisticItem.word,
				line: optimisticItem.line,
				lineNumber: optimisticItem.lineNumber,
				result: optimisticItem.result,
				songId: optimisticItem.songId,
				songPath: optimisticItem.songPath,
			})
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
				v.id === id ? { ...v, mastered: newMastered } : v
			),
		})

		try {
			await switchMasteredState(id)
		} catch (error) {
			// Revert optimistic update
			set({
				vocabulary: vocabulary.map((v) =>
					v.id === id ? { ...v, mastered: item.mastered } : v
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
			const collections = await getUserCollections()
			if (collections) {
				set({ collections, loading: false })
			} else {
				set({ loading: false, error: 'Failed to load collections' })
			}
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
			await addSongToUserCollections(songId)
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
			await removeSongFromUserCollections(songId)
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

	// Utility functions
	setError: (error) => set({ error }),
	setLoading: (loading) => set({ loading }),
}))
