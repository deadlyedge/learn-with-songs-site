import { create } from 'zustand'
import { searchSongs } from '@/actions/search'
import type { SearchSongDTO, SongSearchResponse, Suggestion } from '@/types'

type SearchState = {
	results: SearchSongDTO[]
	source: SongSearchResponse['source'] | null
	hasSearched: boolean
	error: string | null
	canSearchGenius: boolean
	autoContinued: boolean
}

const initialSearchState: SearchState = {
	results: [],
	source: null,
	hasSearched: false,
	error: null,
	canSearchGenius: false,
	autoContinued: false,
}

type SearchStore = {
	// Search input state
	query: string
	suggestions: Suggestion[]
	selectedIndex: number
	showSuggestions: boolean
	lastQuery: string

	// Search result state
	searchState: SearchState

	// UI state
	isPending: boolean

	// Actions
	setQuery: (query: string) => void
	setSuggestions: (suggestions: Suggestion[]) => void
	setSelectedIndex: (index: number) => void
	setShowSuggestions: (show: boolean) => void
	setLastQuery: (query: string) => void
	setIsPending: (pending: boolean) => void

	// Search actions
	resetSearchState: () => void
	updateSearchState: (updates: Partial<SearchState>) => void
	requestSearch: (query: string, source?: string | null) => Promise<void>
	handleSubmit: (query: string) => Promise<void>
	handleSuggestionSelect: (suggestion: Suggestion) => Promise<void>
	handleGeniusSearch: () => Promise<void>

	// Utility
	getReleaseYear: (value?: string | null) => number | null
}

export const useSearchStore = create<SearchStore>((set, get) => ({
	// Initial state
	query: '',
	suggestions: [],
	selectedIndex: -1,
	showSuggestions: false,
	lastQuery: '',
	isPending: false,
	searchState: initialSearchState,

	// Actions
	setQuery: (query) => set({ query }),
	setSuggestions: (suggestions) => set({ suggestions }),
	setSelectedIndex: (index) => set({ selectedIndex: index }),
	setShowSuggestions: (show) => set({ showSuggestions: show }),
	setLastQuery: (query) => set({ lastQuery: query }),
	setIsPending: (pending) => set({ isPending: pending }),

	resetSearchState: () =>
		set(() => ({
			searchState: {
				...initialSearchState,
				hasSearched: true,
			},
		})),

	updateSearchState: (updates) =>
		set((state) => ({
			searchState: { ...state.searchState, ...updates },
		})),

	requestSearch: async (query, source = null) => {
		const { resetSearchState, updateSearchState, setLastQuery } = get()
		setLastQuery(query)
		resetSearchState()

		try {
			const payload = await searchSongs({ query, source })

			updateSearchState({
				results: payload.songs,
				source: payload.source,
				canSearchGenius: payload.canSearchGenius,
				autoContinued: payload.autoContinued,
			})
		} catch (error) {
			console.error(error)
			updateSearchState({
				error: error instanceof Error ? error.message : 'Unknown error',
			})
		}
	},

	handleSubmit: async (query) => {
		const trimmed = query.trim()

		if (!trimmed) {
			get().updateSearchState({
				error: '请输入歌曲名或艺人名后再搜索。',
				hasSearched: false,
			})
			return
		}

		const { setIsPending, requestSearch } = get()
		setIsPending(true)
		try {
			await requestSearch(trimmed)
		} finally {
			setIsPending(false)
		}
	},

	handleSuggestionSelect: async (suggestion) => {
		const { setQuery, setShowSuggestions, setSelectedIndex, requestSearch } = get()
		setQuery(suggestion.text)
		setShowSuggestions(false)
		setSelectedIndex(-1)

		// Automatically trigger search
		setTimeout(async () => {
			try {
				await requestSearch(suggestion.text)
			} catch (error) {
				console.error('Suggestion search failed:', error)
			}
		}, 0)
	},

	handleGeniusSearch: async () => {
		const { lastQuery, requestSearch } = get()
		if (!lastQuery.trim()) {
			return
		}

		await requestSearch(lastQuery, 'genius')
	},

	// Utility
	getReleaseYear: (value) => {
		if (!value) {
			return null
		}

		const parsed = new Date(value)
		return Number.isNaN(parsed.getTime()) ? null : parsed.getFullYear()
	},
}))
